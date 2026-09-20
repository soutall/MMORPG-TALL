// ============================================================================
// mapa_caverna.js — FASE 4: "Caverna Sombria" (DG)
// Módulo isomórfico: roda no NAVEGADOR (expõe funções em window) E no SERVIDOR
// (module.exports), então o mesmo grid de colisão vale para os dois lados.
//
//   • Fase 1 (mapa verde)  : x em [0, 18000) — intacta.
//   • Fase 2 (deserto)     : x em [18000, 50000).
//   • Fase 3 (pântano)     : x em [50000, 58000).
//   • Fase 4 (caverna DG)  : x em [58000, 59800).
//   • Fase 5 (cidade)      : x em [59800, 63800).
//   • Tile = 40px.
//   • Alturas: 0=livre, 1=pequena (bloqueia entidades), 2=média (bloqueia entidades+projéteis),
//     3=alta (bloqueia tudo).
//
// Transição: portal no mapa verde → caverna; portal de retorno na caverna → verde.
// ============================================================================
(function (global) {
    'use strict';

    const TILE = 40;
    const CAV_X0 = 58000;
    const CAV_X1 = 59800;
    const CAV_Y1 = 1800;
    const COLS = (CAV_X1 - CAV_X0) / TILE;   // 45
    const ROWS = CAV_Y1 / TILE;              // 45

    const ALT_LIVRE = 0, ALT_PEQUENA = 1, ALT_MEDIA = 2, ALT_ALTA = 3;
    const TIPOS_ALT = {
        chao: ALT_LIVRE,
        agua: ALT_PEQUENA,
        cristal: ALT_PEQUENA,
        estalactite: ALT_MEDIA,
        parede: ALT_ALTA,
        mont: ALT_ALTA
    };

    // Vórtices espaciais
    const PORTAL_VERDE_CAVERNA = { x: 1400, y: 1400, r: 58, alvo: { x: CAV_X0 + 80, y: 900 } };
    const PORTAL_CAVERNA_SAIDA = { x: CAV_X0 + 80, y: 820, r: 58, alvo: { x: 1480, y: 1400 } };

    let grid = null;
    let sortables = [];
    let decor = [];

    // ---------- PRNG determinístico ----------
    function mulberry32(seed) {
        return function () {
            seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
            let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
            t = (Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    function hash2(a, b) {
        let n = (a * 374761393 + b * 668265263) | 0;
        n = Math.imul(n ^ (n >>> 13), 1274126177);
        return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
    }

    // ---------- Geração ----------
    function marcar(c, l, tipo) {
        if (l >= 0 && l < ROWS && c >= 0 && c < COLS) {
            grid[l][c] = { tipo: tipo, alt: TIPOS_ALT[tipo] || 0 };
        }
    }

    function gerarCaverna() {
        if (grid) return grid;

        grid = [];
        for (let l = 0; l < ROWS; l++) {
            grid[l] = [];
            for (let c = 0; c < COLS; c++) grid[l][c] = { tipo: 'parede', alt: ALT_ALTA };
        }

        const rnd = mulberry32(20260914);

        // ===== Salas e corredores da DG =====
        // Sala de entrada (oeste)
        const salaEntrada = { cx: 2, cy: 22, rx: 3, ry: 5 };
        // Sala intermediária 1
        const sala1 = { cx: 12, cy: 18, rx: 4, ry: 4 };
        // Sala intermediária 2
        const sala2 = { cx: 22, cy: 28, rx: 4, ry: 4 };
        // Sala intermediária 3
        const sala3 = { cx: 32, cy: 20, rx: 3, ry: 5 };
        // Sala do Boss (leste) - Arena expandida
        const salaBoss = { cx: 36, cy: 22, rx: 5, ry: 10 };

        // Escavar salas
        function escavarSala(sala) {
            for (let l = sala.cy - sala.ry; l <= sala.cy + sala.ry; l++) {
                for (let c = sala.cx - sala.rx; c <= sala.cx + sala.rx; c++) {
                    marcar(c, l, 'chao');
                }
            }
        }

        escavarSala(salaEntrada);
        escavarSala(sala1);
        escavarSala(sala2);
        escavarSala(sala3);
        escavarSala(salaBoss);

        // Corredores entre salas (largura 2-3 tiles)
        function escavarCorredor(x1, y1, x2, y2, largura) {
            let passos = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1)) * 2;
            for (let i = 0; i <= passos; i++) {
                let t = passos > 0 ? i / passos : 0;
                let cx = Math.round(x1 + (x2 - x1) * t);
                let cy = Math.round(y1 + (y2 - y1) * t);
                for (let dy = -largura; dy <= largura; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        marcar(cx + dx, cy + dy, 'chao');
                    }
                }
            }
        }

        // Entrada → Sala 1
        escavarCorredor(salaEntrada.cx + salaEntrada.rx, salaEntrada.cy, sala1.cx - sala1.rx, sala1.cy, 1);
        // Sala 1 → Sala 2 (corredor diagonal)
        escavarCorredor(sala1.cx + sala1.rx, sala1.cy, sala2.cx - sala2.rx, sala2.cy, 1);
        // Sala 2 → Sala 3 (corredor diagonal)
        escavarCorredor(sala2.cx + sala2.rx, sala2.cy, sala3.cx - sala3.rx, sala3.cy, 1);
        // Sala 3 → Boss
        escavarCorredor(sala3.cx + sala3.rx, sala3.cy, salaBoss.cx - salaBoss.rx, salaBoss.cy, 2);

        // ===== Decoração: estalactites, cristais, colunas =====
        // Estalactites espalhadas nas salas
        for (let i = 0; i < 18; i++) {
            let c = 2 + Math.floor(rnd() * (COLS - 4));
            let l = 1 + Math.floor(rnd() * (ROWS - 2));
            if (grid[l][c].tipo === 'chao') {
                marcar(c, l, 'estalactite');
            }
        }

        // Cristais brilhantes
        for (let i = 0; i < 12; i++) {
            let c = 2 + Math.floor(rnd() * (COLS - 4));
            let l = 1 + Math.floor(rnd() * (ROWS - 2));
            if (grid[l][c].tipo === 'chao') {
                marcar(c, l, 'cristal');
            }
        }

        // Pequenas poças de água subterrânea
        for (let i = 0; i < 8; i++) {
            let c = 3 + Math.floor(rnd() * (COLS - 6));
            let l = 2 + Math.floor(rnd() * (ROWS - 4));
            if (grid[l][c].tipo === 'chao') {
                marcar(c, l, 'agua');
            }
        }

        // Bloquear impossível acesso ao portal de saída (área limpa)
        marcar(1, 20, 'chao');
        marcar(1, 21, 'chao');
        marcar(1, 22, 'chao');
        marcar(1, 23, 'chao');
        marcar(1, 24, 'chao');
        marcar(0, 20, 'chao');
        marcar(0, 21, 'chao');
        marcar(0, 22, 'chao');
        marcar(0, 23, 'chao');
        marcar(0, 24, 'chao');

        // ===== Colchão de decoração =====
        decor = [];
        for (let i = 0; i < 120; i++) {
            let c = Math.floor(rnd() * COLS);
            let l = Math.floor(rnd() * ROWS);
            if (grid[l][c].tipo !== 'chao') continue;
            let tipo = rnd() > 0.7 ? 'osso' : (rnd() > 0.4 ? 'poeira' : 'musgo');
            decor.push({
                x: CAV_X0 + c * TILE + 5 + rnd() * (TILE - 10),
                y: l * TILE + 5 + rnd() * (TILE - 10),
                r: 1.5 + rnd() * 3,
                tonal: rnd(),
                tipo: tipo
            });
        }

        // ===== Sortables (estalactites como colunas) =====
        sortables = [];
        for (let l = 0; l < ROWS; l++) {
            for (let c = 0; c < COLS; c++) {
                let tipo = grid[l][c].tipo;
                if (tipo === 'estalactite' || tipo === 'cristal') {
                    sortables.push({
                        tipo: tipo,
                        c: c, l: l,
                        x: CAV_X0 + c * TILE + TILE / 2,
                        base: l * TILE + TILE
                    });
                }
            }
        }

        return grid;
    }

    // ---------- Colisão ----------
    function isCaverna(x, y) { return x >= CAV_X0 && x < CAV_X1; }

    function colideCaverna(x, y, raio) {
        if (!grid || !isCaverna(x, y)) return false;
        let c = Math.floor((x - CAV_X0) / TILE);
        let l = Math.floor(y / TILE);
        if (c < 0 || c >= COLS || l < 0 || l >= ROWS) return true;
        return grid[l][c].alt >= ALT_PEQUENA;
    }

    function colideProjetilCaverna(x, y) {
        if (!grid || !isCaverna(x, y)) return false;
        let c = Math.floor((x - CAV_X0) / TILE);
        let l = Math.floor(y / TILE);
        if (c < 0 || c >= COLS || l < 0 || l >= ROWS) return true;
        return grid[l][c].alt >= ALT_MEDIA;
    }

    // Dispatcher unificado (sobrescreve o do pântano para incluir a caverna)
    function colideMapaAtivo(x, y, raio) {
        const m = global.currentMap;
        if (m === 'caverna') return colideCaverna(x, y, raio);
        if (m === 'pantano') return (global.colidePantano ? global.colidePantano(x, y, raio) : false);
        if (m === 'desert') return (global.colideDeserto ? global.colideDeserto(x, y, raio) : false);
        return false;
    }

    function colideProjetilMapaAtivo(x, y) {
        const m = global.currentMap;
        if (m === 'caverna') return colideProjetilCaverna(x, y);
        if (m === 'pantano') return (global.colideProjetilPantano ? global.colideProjetilPantano(x, y) : false);
        if (m === 'desert') return (global.colideProjetilDeserto ? global.colideProjetilDeserto(x, y) : false);
        return false;
    }

    // ---------- Portal detection ----------
    function infoPortalCaverna(x, y) {
        // Dentro da caverna: checar portal de retorno
        if (x >= CAV_X0) {
            if (Math.hypot(x - PORTAL_CAVERNA_SAIDA.x, y - PORTAL_CAVERNA_SAIDA.y) < PORTAL_CAVERNA_SAIDA.r) {
                return { via: 'portal', mapa: 'green', alvo: PORTAL_CAVERNA_SAIDA.alvo };
            }
            return null;
        }
        // No mapa verde: checar portal de entrada para caverna
        if (Math.hypot(x - PORTAL_VERDE_CAVERNA.x, y - PORTAL_VERDE_CAVERNA.y) < PORTAL_VERDE_CAVERNA.r) {
            return { via: 'portal', mapa: 'caverna', alvo: PORTAL_VERDE_CAVERNA.alvo };
        }
        return null;
    }

    // ---------- Transição ----------
    let transicaoAtiva = false;
    let overlayEl = null;

    function obterOverlay() {
        if (overlayEl) return overlayEl;
        overlayEl = document.createElement('div');
        overlayEl.id = 'overlay-mapa-caverna';
        overlayEl.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;background:#0a0a0c;z-index:99999;opacity:0;pointer-events:none;transition:opacity .35s ease;';
        document.body.appendChild(overlayEl);
        return overlayEl;
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

    function _determinarMapa(x) {
        const LW = global.LARGURA_VERDE || 18000, LD = global.LARGURA_DESERTO || 50000, LP = global.LARGURA_PANTANO || 58000, LC = global.LARGURA_CIDADE || 59800;
        if (x >= LC) return 'cidade';
        if (x >= LP) return 'caverna';
        if (x >= LD) return 'pantano';
        if (x >= LW) return 'desert';
        return 'green';
    }

    let cavernaChainAnterior = null;

    // "CÉREBRO" DA CADEIA: substitui o chainMapas anterior (pantano)
    function onUpdatePosicao(x, y) {
        if (transicaoAtiva || global.estaMorto) return;
        if (typeof global.portalMapaPodeDisparar === 'function' && !global.portalMapaPodeDisparar(x, y)) return;

        let info = null;

        // 1) Se estamos na caverna, checar portal de retorno
        if (x >= CAV_X0) {
            info = infoPortalCaverna(x, y);
        }
        // 2) Se estamos no verde, checar portal para caverna
        if (!info && x < (global.LARGURA_VERDE || 18000)) {
            info = infoPortalCaverna(x, y);
        }
        // 3) Delegar para a cadeia anterior (pantano → deserto → verde)
        if (!info && cavernaChainAnterior && typeof cavernaChainAnterior.onUpdatePosicao === 'function') {
            cavernaChainAnterior.onUpdatePosicao(x, y);
            return;
        }

        if (!info) return;
        if (typeof global.solicitarTeleporteMapa === 'function') {
            global.solicitarTeleporteMapa(info.mapa, 'caverna_' + info.mapa);
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

    // ---------- Desenho ----------
    function alturaRelevo(tipo) {
        if (tipo === 'estalactite') return 8;
        if (tipo === 'mont') return 12;
        return 0;
    }

    function desenharCenarioCaverna(t) {
        const ctx = global.ctx;
        if (!ctx) return;

        let camX = global.camX || 0;
        let camY = global.camY || 0;
        let cw = (global.canvas && global.canvas.width) || (global.innerWidth || 800);
        let ch = (global.canvas && global.canvas.height) || (global.innerHeight || 600);
        cw = cw / (global.ZOOM_CAMERA || 1);
        ch = ch / (global.ZOOM_CAMERA || 1);

        // Fundo escuro da caverna
        ctx.clearRect(camX, camY, cw, ch);
        ctx.fillStyle = '#0a0a0c';
        ctx.fillRect(camX, camY, cw, ch);

        if (!grid) gerarCaverna();

        let c0 = Math.max(0, Math.floor((camX - CAV_X0 - 200) / TILE));
        let c1 = Math.min(COLS - 1, Math.ceil((camX - CAV_X0 + cw + 200) / TILE));
        let l0 = Math.max(0, Math.floor((camY - 200) / TILE));
        let l1 = Math.min(ROWS - 1, Math.ceil((camY + ch + 200) / TILE));

        for (let l = l0; l <= l1; l++) {
            for (let c = c0; c <= c1; c++) {
                let cel = grid[l][c];
                let x = CAV_X0 + c * TILE;
                let y = l * TILE;
                let eh = alturaRelevo(cel.tipo);
                if (cel.tipo === 'mont') { desenharMontanhaCaverna(ctx, x, y, c, l, eh); continue; }
                desenharChaoCaverna(ctx, x, y, c, l, cel.tipo, eh);
            }
        }

        // Decoração no chão
        for (let i = 0; i < decor.length; i++) {
            let d = decor[i];
            if (d.x < camX - 20 || d.x > camX + cw + 20 || d.y < camY - 20 || d.y > camY + ch + 20) continue;
            desenharDecorCaverna(ctx, d);
        }

        // Vignette escuro nas bordas para sensação de caverna
        let vigAlpha = 0.25;
        ctx.fillStyle = 'rgba(0,0,0,' + vigAlpha + ')';
        ctx.fillRect(camX, camY, 60, ch);
        ctx.fillRect(camX + cw - 60, camY, 60, ch);
        ctx.fillRect(camX, camY, cw, 40);
        ctx.fillRect(camX, camY + ch - 40, cw, 40);
    }

    function desenharChaoCaverna(ctx, x, y, c, l, tipo, eh) {
        eh = eh || 0;
        let ty = y - eh;
        let h1 = hash2(c, l);

        if (tipo === 'parede' || tipo === 'mont') {
            return; // paredes são desenhadas como montanha
        }

        // Chão base da caverna
        let corBase = '#1a1510';
        if (tipo === 'chao') corBase = '#1a1510';
        else if (tipo === 'estalactite') corBase = '#1a1510';

        if (eh > 0) {
            ctx.fillStyle = '#120e08';
            ctx.fillRect(x, y + TILE - eh, TILE + 1, eh);
            ctx.fillStyle = '#0e0b06';
            ctx.fillRect(x + TILE - eh, ty, eh, TILE + eh);
            ctx.fillStyle = corBase;
            ctx.fillRect(x, ty, TILE + 1, TILE + 1);
            ctx.fillStyle = 'rgba(200, 180, 140, 0.08)';
            ctx.fillRect(x, ty, TILE + 1, 2);
        } else {
            ctx.fillStyle = corBase;
            ctx.fillRect(x, y, TILE + 1, TILE + 1);
        }

        // Textura de pedra no chão
        if (tipo === 'chao') {
            if (h1 > 0.65) {
                ctx.fillStyle = 'rgba(40, 35, 25, 0.6)';
                ctx.fillRect(x + 4 + (c % 3) * 8, ty + 6 + (l % 4) * 7, 10, 4);
            }
            if (h1 < 0.2) {
                ctx.fillStyle = 'rgba(50, 42, 30, 0.4)';
                ctx.beginPath();
                ctx.ellipse(x + 12 + h1 * 16, ty + 20, 6, 3, 0, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Poça de água subterrânea
        if (tipo === 'agua') {
            let f = Math.sin((x + y) * 0.06 + (global.performance ? global.performance.now() : Date.now()) * 0.0018) * 2;
            ctx.fillStyle = '#1a3040';
            ctx.fillRect(x, ty, TILE + 1, TILE + 1);
            ctx.fillStyle = '#2a5070';
            ctx.fillRect(x + 6 + f, ty + 9, 13, 4);
            ctx.fillStyle = '#3a7090';
            ctx.fillRect(x + 22 - f, ty + 26, 10, 3);
            ctx.fillStyle = 'rgba(100,180,255,0.35)';
            ctx.beginPath();
            ctx.arc(x + 27 + f, ty + 14, 2, 0, Math.PI * 2);
            ctx.fill();
        }

        // Cristal brilhante
        if (tipo === 'cristal') {
            let pulso = 0.5 + Math.sin((global.performance ? global.performance.now() : Date.now()) * 0.003 + c * 2 + l) * 0.3;
            ctx.fillStyle = '#1a1510';
            ctx.fillRect(x, y, TILE + 1, TILE + 1);
            // Cristal principal
            ctx.save();
            ctx.globalAlpha = 0.6 + pulso * 0.4;
            ctx.fillStyle = '#5bc0eb';
            ctx.shadowColor = '#5bc0eb';
            ctx.shadowBlur = 12 * pulso;
            ctx.beginPath();
            ctx.moveTo(x + 20, y + 4);
            ctx.lineTo(x + 14, y + TILE - 6);
            ctx.lineTo(x + 26, y + TILE - 6);
            ctx.closePath();
            ctx.fill();
            // Cristal menor
            ctx.fillStyle = '#3a90b0';
            ctx.beginPath();
            ctx.moveTo(x + 12, y + 10);
            ctx.lineTo(x + 8, y + TILE - 8);
            ctx.lineTo(x + 16, y + TILE - 8);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }
    }

    function desenharMontanhaCaverna(ctx, x, y, c, l, eh) {
        eh = eh || 12;
        let ty = y - eh;
        // Parede sul
        ctx.fillStyle = '#1a1408';
        ctx.fillRect(x, y + TILE - eh, TILE + 1, eh);
        // Parede leste
        ctx.fillStyle = '#140f06';
        ctx.fillRect(x + TILE - eh, ty, eh, TILE + eh);
        // Topo
        ctx.fillStyle = '#2a2218';
        ctx.fillRect(x, ty, TILE + 1, TILE + 1);
        // Pico de rocha
        ctx.fillStyle = '#342a1e';
        ctx.beginPath();
        ctx.moveTo(x, ty + TILE);
        ctx.lineTo(x + TILE * 0.4, ty + TILE * 0.15);
        ctx.lineTo(x + TILE, ty + TILE);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#3e3428';
        ctx.beginPath();
        ctx.moveTo(x + TILE * 0.5, ty + TILE);
        ctx.lineTo(x + TILE * 0.75, ty + TILE * 0.45);
        ctx.lineTo(x + TILE, ty + TILE);
        ctx.closePath();
        ctx.fill();
    }

    function desenharDecorCaverna(ctx, d) {
        if (d.tipo === 'osso') {
            ctx.fillStyle = 'rgba(180, 170, 150, 0.35)';
            ctx.fillRect(d.x - d.r * 1.5, d.y - 1, d.r * 3, 2.5);
            ctx.beginPath();
            ctx.arc(d.x - d.r * 1.5, d.y, 2, 0, Math.PI * 2);
            ctx.arc(d.x + d.r * 1.5, d.y, 2, 0, Math.PI * 2);
            ctx.fill();
        } else if (d.tipo === 'musgo') {
            ctx.fillStyle = 'rgba(40, 80, 30, 0.4)';
            ctx.beginPath();
            ctx.ellipse(d.x, d.y, d.r * 2, d.r, 0, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.fillStyle = 'rgba(80, 70, 50, 0.3)';
            ctx.beginPath();
            ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // ---------- Sprites y-sort ----------
    function coletarCavernaSortables(t, arr) {
        if (!grid) gerarCaverna();
        let camX = global.camX || 0;
        let camY = global.camY || 0;
        let cw = (global.canvas && global.canvas.width) ? (global.canvas.width / (global.ZOOM_CAMERA || 1)) : 900;
        let ch = (global.canvas && global.canvas.height) ? (global.canvas.height / (global.ZOOM_CAMERA || 1)) : 600;
        for (let i = 0; i < sortables.length; i++) {
            let s = sortables[i];
            if (s.x < camX - 200 || s.x > camX + cw + 200 || s.base < camY - 200 || s.base > camY + ch + 40) continue;
            arr.push({
                y: s.base,
                draw: (function (spr, tm) {
                    return function () {
                        if (spr.tipo === 'estalactite') desenharEstalactite(global.ctx, spr);
                        else desenharCristalSprite(global.ctx, spr, tm);
                    };
                })(s, t)
            });
        }
    }

    function desenharEstalactite(ctx, s) {
        if (!ctx) return;
        ctx.save();
        ctx.translate(s.x, s.base);
        // Sombra
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath();
        ctx.ellipse(0, -2, 14, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        // Coluna de rocha
        ctx.fillStyle = '#2a2218';
        ctx.fillRect(-7, -38, 14, 38);
        ctx.fillStyle = '#342a1e';
        ctx.beginPath();
        ctx.moveTo(-8, 0);
        ctx.lineTo(-7, -38);
        ctx.lineTo(7, -38);
        ctx.lineTo(8, 0);
        ctx.closePath();
        ctx.fill();
        // Topo (espinho apontando pra baixo)
        ctx.fillStyle = '#3e3428';
        ctx.beginPath();
        ctx.moveTo(-5, -38);
        ctx.lineTo(0, -48);
        ctx.lineTo(5, -38);
        ctx.closePath();
        ctx.fill();
        // Brilho sutil
        ctx.fillStyle = 'rgba(140, 120, 90, 0.15)';
        ctx.fillRect(-3, -40, 6, 20);
        ctx.restore();
    }

    function desenharCristalSprite(ctx, s, t) {
        if (!ctx) return;
        let pulso = 0.5 + Math.sin(t * 2.5 + s.x * 0.03) * 0.3;
        ctx.save();
        ctx.translate(s.x, s.base);
        // Sombra
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(0, -2, 12, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        // Cristal grande
        ctx.globalAlpha = 0.6 + pulso * 0.4;
        ctx.fillStyle = '#5bc0eb';
        ctx.shadowColor = '#5bc0eb';
        ctx.shadowBlur = 14 * pulso;
        ctx.beginPath();
        ctx.moveTo(0, -44);
        ctx.lineTo(-8, -6);
        ctx.lineTo(8, -6);
        ctx.closePath();
        ctx.fill();
        // Cristal pequeno ao lado
        ctx.fillStyle = '#3a90b0';
        ctx.shadowBlur = 8 * pulso;
        ctx.beginPath();
        ctx.moveTo(-14, -30);
        ctx.lineTo(-18, -8);
        ctx.lineTo(-10, -8);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    // ---------- Portais visuais ----------
    function desenharVortex(ctx, x, y, t, cor) {
        ctx.save();
        ctx.shadowColor = cor;
        ctx.shadowBlur = 18;
        ctx.fillStyle = 'rgba(10, 5, 20, 0.6)';
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

    function desenharPortalCavernaVerde(t) {
        const ctx = global.ctx;
        if (ctx) desenharVortex(ctx, PORTAL_VERDE_CAVERNA.x, PORTAL_VERDE_CAVERNA.y, t, '#4a9eaf');
    }

    function desenharPortalCavernaSaida(t) {
        const ctx = global.ctx;
        if (ctx) desenharVortex(ctx, PORTAL_CAVERNA_SAIDA.x, PORTAL_CAVERNA_SAIDA.y, t, '#4a9eaf');
    }

    // ---------- Reset de instância ----------
    function resetarCaverna() {
        grid = null;
        sortables = [];
        decor = [];
    }

    // ---------- Depósito seguro ----------
    function depositarPosicaoSegura(x0, y0) {
        if (!colideCaverna(x0, y0, 10)) return { x: x0, y: y0 };
        for (let r = 1; r <= 4; r++) {
            for (let a = 0; a < 8; a++) {
                let ang = (a / 8) * Math.PI * 2;
                let x = x0 + Math.cos(ang) * r * TILE;
                let y = y0 + Math.sin(ang) * r * TILE;
                if (!colideCaverna(x, y, 10)) return { x: x, y: y };
            }
        }
        return { x: PORTAL_VERDE_CAVERNA.alvo.x, y: PORTAL_VERDE_CAVERNA.alvo.y };
    }

    // ---------------- API ----------------
    const api = {
        TILE: TILE,
        CAV_X0: CAV_X0, CAV_X1: CAV_X1, CAV_Y1: CAV_Y1,
        COLS: COLS, ROWS: ROWS,
        ALT_LIVRE: ALT_LIVRE, ALT_PEQUENA: ALT_PEQUENA, ALT_MEDIA: ALT_MEDIA, ALT_ALTA: ALT_ALTA,
        PORTAL_VERDE_CAVERNA: PORTAL_VERDE_CAVERNA,
        PORTAL_CAVERNA_SAIDA: PORTAL_CAVERNA_SAIDA,
        gerarCaverna: gerarCaverna,
        resetarCaverna: resetarCaverna,
        grid: function () { return grid; },
        isCaverna: isCaverna,
        colideCaverna: colideCaverna,
        colideProjetilCaverna: colideProjetilCaverna,
        infoPortalCaverna: infoPortalCaverna,
        depositarPosicaoSegura: depositarPosicaoSegura,
        desenharCenarioCaverna: desenharCenarioCaverna,
        coletarCavernaSortables: coletarCavernaSortables,
        colideMapaAtivo: colideMapaAtivo,
        colideProjetilMapaAtivo: colideProjetilMapaAtivo,
        desenharPortalCavernaVerde: desenharPortalCavernaVerde,
        desenharPortalCavernaSaida: desenharPortalCavernaSaida,
        sortables: function () { return sortables; }
    };

    // ---------- Expoê para o navegador ----------
    if (global.window) {
        gerarCaverna();
        // Captura o chainMapas anterior (pantano) no escopo local, antes de sobrescrever
        cavernaChainAnterior = global.chainMapas;
        global.chainMapas = { onUpdatePosicao: onUpdatePosicao };

        global.desenharCenarioCaverna = desenharCenarioCaverna;
        global.coletarCavernaSortables = coletarCavernaSortables;
        global.colideCaverna = colideCaverna;
        global.colideProjetilCaverna = colideProjetilCaverna;
        global.colideMapaAtivo = colideMapaAtivo;
        global.colideProjetilMapaAtivo = colideProjetilMapaAtivo;
        global.desenharPortalCavernaVerde = desenharPortalCavernaVerde;
        global.desenharPortalCavernaSaida = desenharPortalCavernaSaida;
        global.mapaCaverna = api;
    }

    // ---------- Expoê para o Node ----------
    if (typeof module !== 'undefined' && module.exports) {
        if (!grid) gerarCaverna();
        module.exports = api;
    }
})(typeof window !== 'undefined' ? window : this);
