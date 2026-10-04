// ============================================================================
// mapa_nebulos.js — "Floresta dos Nebulos" (Vila da Floresta)
// Módulo isomórfico: navegador (window) e servidor (module.exports).
//
// MAPA POR ID ÚNICA — coordenadas EXCLUSIVAS:
//   • faixa própria : x em [98000, 107600) × y em [0, 5400).
//   • tile = 40px   → COLS=240, ROWS=135 (9.600 × 5.400 px).
//
// Reconstrução viva (Opção B) da arte de referência:
//   • Vila de troncos a oeste: 6 cabanas + poço + fogueira comunal + hortas
//     (estruturas como OBJETOS DO EDITOR em map_objetos.json — editáveis!)
//   • Rio serpenteante N→S com 3 pontes (2 de madeira + 1 de pedra)
//   • Grande lago a leste (píer e barco entram como objetos do editor)
//   • Torre de vigia NO · acampamento de lenhador NE · caverna SE
//   • Trilhas de terra conectando tudo · floresta densa nas bordas
// ============================================================================
(function (global) {
    'use strict';

    const TILE = 40;
    const NEB_X0 = 98000;
    const NEB_X1 = 107600;
    const NEB_Y1 = 5400;
    const COLS = (NEB_X1 - NEB_X0) / TILE;   // 240
    const ROWS = NEB_Y1 / TILE;              // 135

    const ALT_LIVRE = 0, ALT_PEQUENA = 1, ALT_MEDIA = 2, ALT_ALTA = 3;
    const TIPOS_ALT = {
        grama: ALT_LIVRE,
        flor: ALT_LIVRE,
        trilha: ALT_LIVRE,
        terra: ALT_LIVRE,
        ponte_madeira: ALT_LIVRE,
        ponte_pedra: ALT_LIVRE,
        pedra: ALT_PEQUENA,
        arbusto: ALT_PEQUENA,
        arvore: ALT_MEDIA,
        agua: ALT_MEDIA,
        arvore_gigante: ALT_ALTA
    };

    // Centro da vila (spawn) e portal de retorno
    const VC = 80, VL = 66;                        // vila em tiles
    const NEB_SPAWN = { x: 102860, y: 2700 };
    const PONTO_CHEGADA = { x: NEB_SPAWN.x, y: NEB_SPAWN.y };
    const PORTAL_NEBOLOS_RETORNO = null; // Portal de retorno para a cidade desativado no design atual.

    let grid = null;
    let sortables = [];
    let nebulosChainAnterior = null;
    let prevColide = null;
    let prevColideP = null;

    function mulberry32(seed) {
        return function () {
            seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
            let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
            t = Math.imul(t ^ (t >>> 7), 61 | t) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }
    function hash2(a, b) {
        let n = (a * 374761393 + b * 668265263) | 0;
        n = Math.imul(n ^ (n >>> 13), 1274126177);
        return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
    }

    function marcar(c, l, tipo) {
        if (l >= 0 && l < ROWS && c >= 0 && c < COLS) {
            grid[l][c] = { tipo: tipo, alt: TIPOS_ALT[tipo] !== undefined ? TIPOS_ALT[tipo] : ALT_LIVRE };
        }
    }
    function tipoEm(c, l) {
        if (l < 0 || l >= ROWS || c < 0 || c >= COLS) return null;
        return grid[l][c].tipo;
    }
    function centroRio(l) { return 122 + Math.round(Math.sin(l * 0.085) * 7); }

    function limparClareira(cc, cl, raio) {
        for (let l = cl - raio; l <= cl + raio; l++) {
            for (let c = cc - raio; c <= cc + raio; c++) {
                if (l <= 2 || l >= ROWS - 3 || c <= 2 || c >= COLS - 3) continue;
                const d = Math.hypot(c - cc, l - cl);
                if (d <= raio) {
                    const t = tipoEm(c, l);
                    if (t !== 'agua' && t !== 'ponte_madeira' && t !== 'ponte_pedra') marcar(c, l, 'grama');
                }
            }
        }
    }

    function trilhaDiag(cA, lA, cB, lB) {
        const passos = Math.max(Math.abs(cB - cA), Math.abs(lB - lA));
        for (let i = 0; i <= passos; i++) {
            const c = Math.round(cA + (cB - cA) * i / passos);
            const l = Math.round(lA + (lB - lA) * i / passos);
            for (let dc = 0; dc < 2; dc++) {
                for (let dl = 0; dl < 2; dl++) {
                    const t = tipoEm(c + dc, l + dl);
                    if (t === 'agua') marcar(c + dc, l + dl, 'ponte_madeira');
                    else if (t !== 'arvore_gigante' && t !== 'ponte_madeira' && t !== 'ponte_pedra') marcar(c + dc, l + dl, 'trilha');
                }
            }
        }
    }

    function trilhaFaixa(cA, cB, lA, lB) {
        for (let c = Math.min(cA, cB); c <= Math.max(cA, cB); c++) {
            for (let l = Math.min(lA, lB); l <= Math.max(lA, lB); l++) {
                const t = tipoEm(c, l);
                if (t === 'agua') marcar(c, l, 'ponte_madeira');
                else if (t !== 'arvore_gigante' && t !== 'ponte_madeira' && t !== 'ponte_pedra') marcar(c, l, 'trilha');
            }
        }
    }

    function gerarNebulos() {
        if (grid) return grid;
        grid = [];
        for (let l = 0; l < ROWS; l++) {
            grid[l] = [];
            for (let c = 0; c < COLS; c++) grid[l][c] = { tipo: 'grama', alt: ALT_LIVRE };
        }

        // 1) ANEL DE FLORESTA DENSA (3 tiles, bloqueia tudo)
        for (let l = 0; l < ROWS; l++) {
            for (let c = 0; c < COLS; c++) {
                if (c <= 2 || c >= COLS - 3 || l <= 2 || l >= ROWS - 3) marcar(c, l, 'arvore_gigante');
            }
        }

        // 2) RIO SERPENTEANTE N→S (5 tiles de largura + margens de areia)
        for (let l = 3; l < ROWS - 3; l++) {
            const centro = centroRio(l);
            for (let c = centro - 2; c <= centro + 2; c++) marcar(c, l, 'agua');
            marcar(centro - 3, l, 'terra'); marcar(centro + 3, l, 'terra');
        }

        // 3) GRANDE LAGO A LESTE (com margem de areia)
        for (let l = 34; l <= 106; l++) {
            for (let c = 182; c <= COLS - 4; c++) {
                const dx = (c - 214) / 30, dy = (l - 70) / 33;
                const d = dx * dx + dy * dy;
                if (d <= 1) marcar(c, l, 'agua');
                else if (d <= 1.4 && tipoEm(c, l) === 'grama') marcar(c, l, 'terra');
            }
        }

        // 4) TRÊS PONTES sobre o rio (norte/sul = madeira; meio = pedra)
        [20, 64, 98].forEach(function (l) {
            const centro = centroRio(l);
            const tipoPonte = (l === 64) ? 'ponte_pedra' : 'ponte_madeira';
            for (let c = centro - 3; c <= centro + 3; c++) marcar(c, l, tipoPonte);
        });

        // 5) CLAREIRAS (vila + pontos de interesse)
        limparClareira(VC, VL, 20);    // vila
        limparClareira(22, 14, 7);     // torre de vigia NO
        limparClareira(158, 22, 8);    // acampamento do lenhador NE
        limparClareira(182, 112, 8);   // caverna SE
        limparClareira(190, 68, 5);    // margem do lago (píer)

        // 6) TRILHAS DE TERRA (rede da referência; rio só se atravessa pelas pontes)
        trilhaFaixa(3, VC - 12, VL - 1, VL + 1);        // portal oeste → vila
        trilhaFaixa(VC - 12, VC + 12, VL - 1, VL + 1);  // vila (eixo leste-oeste)
        trilhaFaixa(VC + 12, centroRio(64) - 4, VL - 2, VL + 2);   // vila → margem oeste
        trilhaFaixa(centroRio(64) - 4, centroRio(64) + 4, 64, 64); // aproximação da ponte de pedra
        trilhaFaixa(centroRio(64) + 5, 158, VL - 2, VL + 2);       // margem leste → acampamento
        trilhaFaixa(156, 160, 22, VL - 2);              // subida ao acampamento NE
        trilhaFaixa(148, 166, 21, 23);                  // pátio do acampamento
        trilhaFaixa(158, 186, VL + 3, VL + 5);          // vila → margem do lago (píer é objeto)
        trilhaFaixa(88, 92, 26, VL - 12);               // vila → ponte norte
        trilhaFaixa(92, centroRio(20) - 4, 19, 21);     // aproximação oeste da ponte norte
        trilhaFaixa(centroRio(20) + 5, 156, 19, 21);    // ponte norte → acampamento
        trilhaFaixa(88, 92, VL + 12, 96);               // vila → ponte sul
        trilhaFaixa(92, centroRio(98) - 4, 97, 99);     // aproximação oeste da ponte sul
        trilhaDiag(centroRio(98) + 5, 99, 178, 112);    // ponte sul → caverna SE (diagonal)
        trilhaFaixa(20, 64, VL - 6, VL - 4);            // vila → torre de vigia
        trilhaFaixa(20, 24, 14, VL - 6);                // descida à torre
        // anel da vila (raio 14×9 em volta do centro)
        for (let a = 0; a < 64; a++) {
            const ang = (a / 64) * Math.PI * 2;
            const c = VC + Math.round(Math.cos(ang) * 14);
            const l = VL + Math.round(Math.sin(ang) * 9);
            if (tipoEm(c, l) === 'grama' || tipoEm(c, l) === 'flor') marcar(c, l, 'trilha');
        }

        // 7) ZONAS SEGURAS (spawn central e portal nunca têm vegetação/água)
        for (let l = VL - 4; l <= VL + 4; l++) {
            for (let c = VC - 4; c <= VC + 4; c++) {
                const t = tipoEm(c, l);
                if (t === 'agua' || t === 'arvore' || t === 'arbusto' || t === 'pedra' || t === 'arvore_gigante') marcar(c, l, 'grama');
            }
        }
        for (let l = 61; l <= 71; l++) {
            for (let c = 2; c <= 9; c++) {
                if (tipoEm(c, l) === 'arvore_gigante') marcar(c, l, 'grama');
            }
        }

        // 8) VEGETAÇÃO PROCEDURAL (floresta densa da referência)
        for (let l = 3; l < ROWS - 3; l++) {
            for (let c = 3; c < COLS - 3; c++) {
                const t = tipoEm(c, l);
                if (t !== 'grama' && t !== 'terra') continue;
                if (c >= VC - 4 && c <= VC + 4 && l >= VL - 4 && l <= VL + 4) continue;
                if (c >= 2 && c <= 9 && l >= 61 && l <= 71) continue;
                // bordas e áreas de floresta densa: mais árvores
                const pertoBorda = (c < 10 || c > COLS - 12 || l < 8 || l > ROWS - 10);
                const densidade = pertoBorda ? 0.42 : 0.22;
                const h = hash2(c * 17, l * 43);
                const pertoDeTrilha = tipoEm(c - 1, l) === 'trilha' || tipoEm(c + 1, l) === 'trilha' ||
                    tipoEm(c, l - 1) === 'trilha' || tipoEm(c, l + 1) === 'trilha';
                if (pertoDeTrilha) {
                    if (h > 0.90) marcar(c, l, 'flor');
                    continue;
                }
                if (h < densidade) marcar(c, l, 'arvore');
                else if (h < densidade + 0.04) marcar(c, l, 'arbusto');
                else if (h > 0.975) marcar(c, l, 'pedra');
                else if (h > 0.40 && h < 0.47 && t === 'grama') marcar(c, l, 'flor');
                if (hash2(c * 7 + 3, l * 13 + 5) > 0.992) marcar(c, l, 'arvore_gigante');
            }
        }

        return grid;
    }

    function resetarNebulos() { grid = null; sortables = []; }

    function isNebulos(x, y) { return x >= NEB_X0 && x < NEB_X1 && y >= 0 && y < NEB_Y1; }

    function alcanceAltura(x, y, minAlt, r) {
        if (!grid) gerarNebulos();
        const r2 = (typeof r === 'number') ? r : 8;
        const c0 = Math.max(0, Math.floor((x - NEB_X0 - r2) / TILE));
        const c1 = Math.min(COLS - 1, Math.floor((x - NEB_X0 + r2) / TILE));
        const l0 = Math.max(0, Math.floor((y - r2) / TILE));
        const l1 = Math.min(ROWS - 1, Math.floor((y + r2) / TILE));
        for (let l = l0; l <= l1; l++) {
            for (let c = c0; c <= c1; c++) {
                if (grid[l][c].alt >= minAlt) return true;
            }
        }
        return false;
    }

    function zonaSeguraChegada(x, y) {
        return x >= PONTO_CHEGADA.x - 60 && x <= PONTO_CHEGADA.x + 60 &&
            y >= PONTO_CHEGADA.y - 60 && y <= PONTO_CHEGADA.y + 60;
    }

    function colideNebulos(x, y, raio) {
        if (!isNebulos(x, y)) return false;
        if (zonaSeguraChegada(x, y)) return false;
        return alcanceAltura(x, y, ALT_PEQUENA, raio);
    }

    function colideProjetilNebulos(x, y) {
        if (!isNebulos(x, y)) return false;
        if (!grid) gerarNebulos();
        const c = Math.floor((x - NEB_X0) / TILE);
        const l = Math.floor(y / TILE);
        if (c < 0 || c >= COLS || l < 0 || l >= ROWS) return true;
        return grid[l][c].alt >= ALT_MEDIA;
    }

    function colideMapaAtivo(x, y, raio) {
        const m = global.currentMap;
        if (m === 'nebulos') return !isNebulos(x, y) || colideNebulos(x, y, raio);
        if (isNebulos(x, y)) return false;
        return typeof prevColide === 'function' ? prevColide(x, y, raio) : false;
    }

    function colideProjetilMapaAtivo(x, y) {
        const m = global.currentMap;
        if (m === 'nebulos') return !isNebulos(x, y) || colideProjetilNebulos(x, y);
        if (isNebulos(x, y)) return false;
        return typeof prevColideP === 'function' ? prevColideP(x, y) : false;
    }

    function depositarPosicaoSegura(x0, y0) {
        if (!colideNebulos(x0, y0, 10)) return { x: x0, y: y0 };
        for (let r = 1; r <= 5; r++) {
            for (let a = 0; a < 10; a++) {
                const ang = (a / 10) * Math.PI * 2;
                const x = x0 + Math.cos(ang) * r * TILE;
                const y = y0 + Math.sin(ang) * r * TILE;
                if (!colideNebulos(x, y, 10)) return { x: x, y: y };
            }
        }
        return { x: PONTO_CHEGADA.x, y: PONTO_CHEGADA.y };
    }

    function infoPortalNebulos(x, y) {
        if (global.currentMap !== 'nebulos') return null;
        if (PORTAL_NEBOLOS_RETORNO && Math.hypot(x - PORTAL_NEBOLOS_RETORNO.x, y - PORTAL_NEBOLOS_RETORNO.y) < PORTAL_NEBOLOS_RETORNO.r) {
            return { via: 'portal', mapa: 'cidade', alvo: PORTAL_NEBOLOS_RETORNO.alvo };
        }
        return null;
    }

    function determinarMapaPorX(x) {
        if (global.MAPAS_REGISTRY) {
            const ids = Object.keys(global.MAPAS_REGISTRY);
            for (let i = 0; i < ids.length; i++) {
                const m = global.MAPAS_REGISTRY[ids[i]];
                if (x >= m.x0 && x < m.x0 + m.w) return m.id;
            }
        }
        return 'nebulos';
    }

    function onUpdatePosicao(x, y) {
        if (global.estaMorto) return;
        if (typeof global.portalMapaPodeDisparar === 'function' && !global.portalMapaPodeDisparar(x, y)) return;
        let info = null;
        if (x >= NEB_X0) {
            info = infoPortalNebulos(x, y);
        } else if (nebulosChainAnterior && typeof nebulosChainAnterior.onUpdatePosicao === 'function') {
            nebulosChainAnterior.onUpdatePosicao(x, y);
            return;
        }
        if (!info) return;
        if (typeof global.solicitarTeleporteMapa === 'function') {
            global.solicitarTeleporteMapa(info.mapa, 'nebulos_' + info.mapa);
        }
    }

    function coletarNebulosSortables(t, arr) { /* estruturas entram como objetos do editor */ }

    // ============================================================================
    // RENDERIZAÇÃO DO CLIENTE — desenharCenarioNebulos(t) — luz de dia (referência)
    // ============================================================================
    function desenharCenarioNebulos(t) {
        const ctx = global.ctx;
        if (!ctx) return;
        if (!grid) gerarNebulos();
        const camX = global.camX || 0, camY = global.camY || 0;
        const cw = ((global.canvas && global.canvas.width) || 900) / (global.ZOOM_CAMERA || 1);
        const ch = ((global.canvas && global.canvas.height) || 600) / (global.ZOOM_CAMERA || 1);
        const c0 = Math.max(0, Math.floor((camX - NEB_X0 - 240) / TILE));
        const c1 = Math.min(COLS - 1, Math.ceil((camX - NEB_X0 + cw + 240) / TILE));
        const l0 = Math.max(0, Math.floor((camY - 260) / TILE));
        const l1 = Math.min(ROWS - 1, Math.ceil((camY + ch + 260) / TILE));

        // ---------- PASSO 1: CHÃO ----------
        for (let l = l0; l <= l1; l++) {
            for (let c = c0; c <= c1; c++) {
                const x = NEB_X0 + c * TILE, y = l * TILE;
                const tl = grid[l][c].tipo;
                const h = hash2(c * 31, l * 57);
                if (tl === 'agua') {
                    const g = ctx.createLinearGradient(x, y, x, y + TILE);
                    g.addColorStop(0, '#3d7fa8');
                    g.addColorStop(1, '#2a5f80');
                    ctx.fillStyle = g;
                    ctx.fillRect(x, y, TILE, TILE);
                    const onda = Math.sin(t * 1.8 + (c * 0.9 + l * 0.6)) * 0.5 + 0.5;
                    ctx.fillStyle = 'rgba(160, 220, 240,' + (0.10 + onda * 0.12).toFixed(3) + ')';
                    ctx.fillRect(x, y + 6 + onda * 10, TILE, 3);
                    ctx.fillStyle = 'rgba(220, 245, 250,' + (onda * 0.15).toFixed(3) + ')';
                    ctx.fillRect(x + 4 + onda * 8, y + TILE - 12, TILE * 0.35, 2);
                    if (l + 1 < ROWS && grid[l + 1][c].tipo !== 'agua') {
                        ctx.fillStyle = 'rgba(225, 245, 250, 0.4)';
                        ctx.fillRect(x, y + TILE - 3, TILE, 3);
                    }
                    if (l - 1 >= 0 && grid[l - 1][c].tipo !== 'agua') {
                        ctx.fillStyle = 'rgba(225, 245, 250, 0.3)';
                        ctx.fillRect(x, y, TILE, 3);
                    }
                } else if (tl === 'ponte_madeira') {
                    ctx.fillStyle = '#6e4c2e';
                    ctx.fillRect(x, y, TILE, TILE);
                    ctx.fillStyle = '#82603c';
                    for (let i = 0; i < 4; i++) ctx.fillRect(x, y + 2 + i * 10, TILE, 6);
                    ctx.fillStyle = '#4a3018';
                    ctx.fillRect(x, y, TILE, 2);
                    ctx.fillRect(x, y + TILE - 2, TILE, 2);
                } else if (tl === 'ponte_pedra') {
                    ctx.fillStyle = '#8d8d86';
                    ctx.fillRect(x, y, TILE, TILE);
                    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
                    ctx.lineWidth = 1.5;
                    ctx.strokeRect(x + 1, y + 1, TILE - 2, TILE - 2);
                    ctx.fillStyle = '#a3a39a';
                    ctx.fillRect(x + 5, y + 5, TILE - 10, TILE - 10);
                    ctx.fillStyle = 'rgba(0,0,0,0.15)';
                    ctx.fillRect(x + 5, y + TILE / 2, TILE - 10, 2);
                } else if (tl === 'trilha' || tl === 'terra') {
                    ctx.fillStyle = tl === 'trilha' ? '#9a7a52' : '#c2b280';
                    ctx.fillRect(x, y, TILE, TILE);
                    ctx.fillStyle = 'rgba(0,0,0,0.08)';
                    if (h > 0.5) ctx.fillRect(x + 6, y + 10, 8, 4);
                    if (h < 0.3) ctx.fillRect(x + 22, y + 24, 10, 4);
                } else {
                    const tons = ['#3a7c3f', '#428a47', '#357039'];
                    ctx.fillStyle = tons[Math.floor(h * 3) % 3];
                    ctx.fillRect(x, y, TILE, TILE);
                    if (tl === 'flor') {
                        const cores = ['#e8d44d', '#d980e0', '#eeeeee'];
                        ctx.fillStyle = cores[Math.floor(h * 97) % 3];
                        ctx.beginPath(); ctx.arc(x + 10 + h * 12, y + 12, 2.2, 0, Math.PI * 2); ctx.fill();
                        ctx.beginPath(); ctx.arc(x + 26, y + 28 - h * 8, 2, 0, Math.PI * 2); ctx.fill();
                    }
                }
            }
        }

        // ---------- PASSO 2: ÁRVORES E OBJETOS DO GRID (ordem por linha) ----------
        for (let l = l0; l <= l1; l++) {
            for (let c = c0; c <= c1; c++) {
                const x = NEB_X0 + c * TILE, y = l * TILE;
                const tl = grid[l][c].tipo;
                const cxTile = x + TILE / 2, cyBase = y + TILE - 6;
                const h = hash2(c * 17, l * 43);

                if (tl === 'arvore' || tl === 'arvore_gigante') {
                    const gig = tl === 'arvore_gigante';
                    const betula = !gig && h > 0.88; // bétulas misturadas na floresta
                    const escala = gig ? 1.9 : (0.85 + h * 0.35);
                    const fase = h * Math.PI * 2;
                    const balanco = Math.sin(t * 1.3 + fase) * (gig ? 3.2 : 2.2);
                    ctx.fillStyle = 'rgba(0,0,0,0.22)';
                    ctx.beginPath();
                    ctx.ellipse(cxTile, cyBase + 3, 13 * escala, 5 * escala, 0, 0, Math.PI * 2);
                    ctx.fill();
                    if (betula) {
                        // tronco branco com marcas escuras
                        ctx.fillStyle = '#e8e4da';
                        ctx.fillRect(cxTile - 3.5 * escala, cyBase - 26 * escala, 7 * escala, 26 * escala);
                        ctx.fillStyle = '#3a352e';
                        ctx.fillRect(cxTile - 3 * escala, cyBase - 20 * escala, 4 * escala, 2);
                        ctx.fillRect(cxTile - 2 * escala, cyBase - 12 * escala, 3.5 * escala, 2);
                        ctx.fillStyle = ['#9cc259', '#aad06b'][Math.floor(h * 2) % 2];
                        for (let k = 0; k < 2; k++) {
                            const rr = 14 * escala - k * 5 * escala;
                            const yy = cyBase - (30 + k * 11) * escala;
                            ctx.beginPath();
                            ctx.ellipse(cxTile + balanco * (0.4 + k * 0.3), yy, rr, rr * 0.8, 0, 0, Math.PI * 2);
                            ctx.fill();
                        }
                    } else {
                        ctx.fillStyle = gig ? '#4a3320' : '#5b4028';
                        ctx.fillRect(cxTile - 4 * escala, cyBase - 26 * escala, 8 * escala, 26 * escala);
                        ctx.fillStyle = 'rgba(0,0,0,0.2)';
                        ctx.fillRect(cxTile + 1 * escala, cyBase - 26 * escala, 3 * escala, 26 * escala);
                        const copaCores = gig ? ['#1e4d22', '#27632b', '#317a35'] : ['#2a5c2e', '#347038', '#3f8543'];
                        for (let k = 0; k < 3; k++) {
                            const rr = (gig ? 26 : 17) * escala - k * 6 * escala;
                            const yy = cyBase - (gig ? 40 : 30) * escala - k * 12 * escala;
                            ctx.fillStyle = copaCores[k];
                            ctx.beginPath();
                            ctx.ellipse(cxTile + balanco * (0.4 + k * 0.3), yy, rr, rr * 0.82, 0, 0, Math.PI * 2);
                            ctx.fill();
                        }
                    }
                } else if (tl === 'arbusto') {
                    const fase = h * Math.PI * 2;
                    const balanco = Math.sin(t * 1.6 + fase) * 1.4;
                    ctx.fillStyle = 'rgba(0,0,0,0.16)';
                    ctx.beginPath(); ctx.ellipse(cxTile, cyBase + 2, 11, 4, 0, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = '#357039';
                    ctx.beginPath(); ctx.ellipse(cxTile + balanco * 0.4, y + 22, 12, 9, 0, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = '#438347';
                    ctx.beginPath(); ctx.ellipse(cxTile + balanco * 0.6 - 2, y + 17, 8, 6, 0, 0, Math.PI * 2); ctx.fill();
                } else if (tl === 'pedra') {
                    ctx.fillStyle = 'rgba(0,0,0,0.2)';
                    ctx.beginPath(); ctx.ellipse(cxTile, cyBase + 2, 12, 5, 0, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = '#8d8d86';
                    ctx.beginPath();
                    ctx.moveTo(x + 6, y + 30); ctx.lineTo(x + 12, y + 14); ctx.lineTo(x + 26, y + 12);
                    ctx.lineTo(x + 34, y + 28); ctx.lineTo(x + 24, y + 34); ctx.lineTo(x + 10, y + 33);
                    ctx.closePath(); ctx.fill();
                    ctx.fillStyle = 'rgba(255,255,255,0.18)';
                    ctx.beginPath();
                    ctx.moveTo(x + 12, y + 14); ctx.lineTo(x + 26, y + 12); ctx.lineTo(x + 22, y + 20);
                    ctx.lineTo(x + 14, y + 21); ctx.closePath(); ctx.fill();
                }
            }
        }

        // ---------- PASSO 3: PORTAL DE RETORNO ----------
        desenharPortalNebulos(ctx, t, camX, camY, cw, ch);
    }

    // ---- Portal de retorno (vórtice azul-esverdeado da vila) ----
    function desenharPortalNebulos(ctx, t, camX, camY, cw, ch) {
        const p = PORTAL_NEBOLOS_RETORNO;
        if (!p) return;
        if (p.x + p.r + 120 < camX || p.x - p.r - 120 > camX + cw || p.y + p.r + 120 < camY || p.y - p.r - 120 > camY + ch) return;
        const pulsar = 1 + Math.sin(t * 2.2) * 0.06;
        const R = p.r * pulsar;
        ctx.save();
        const haloR = R * 1.8 + Math.sin(t * 3.1) * 4;
        const gHalo = ctx.createRadialGradient(p.x, p.y, R * 0.4, p.x, p.y, haloR);
        gHalo.addColorStop(0, 'rgba(90, 200, 235, 0.16)');
        gHalo.addColorStop(0.55, 'rgba(40, 130, 170, 0.08)');
        gHalo.addColorStop(1, 'rgba(20, 80, 110, 0)');
        ctx.fillStyle = gHalo;
        ctx.beginPath(); ctx.ellipse(p.x, p.y, haloR, haloR * 0.62, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(140, 225, 250, 0.9)';
        ctx.lineWidth = 3;
        ctx.setLineDash([R * 0.6, R * 0.3]);
        ctx.beginPath(); ctx.ellipse(p.x, p.y, R * 1.25, R * 0.66, t * 0.9, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([R * 0.45, R * 0.42]);
        ctx.strokeStyle = 'rgba(70, 170, 210, 0.75)';
        ctx.beginPath(); ctx.ellipse(p.x, p.y, R * 1.4, R * 0.72, -t * 0.65, Math.PI * 0.3, Math.PI * 2.3); ctx.stroke();
        ctx.setLineDash([]);
        const gV = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, R);
        gV.addColorStop(0, 'rgba(240, 252, 255, 0.95)');
        gV.addColorStop(0.3, 'rgba(150, 230, 250, 0.85)');
        gV.addColorStop(0.65, 'rgba(50, 140, 180, 0.6)');
        gV.addColorStop(1, 'rgba(15, 60, 85, 0.4)');
        ctx.fillStyle = gV;
        ctx.beginPath(); ctx.ellipse(p.x, p.y, R - 1, R * 0.55, 0, 0, Math.PI * 2); ctx.fill();
        for (let i = 0; i < 10; i++) {
            const prog = (t * 0.8 + i / 10) % 1;
            const swayX = Math.sin(t * 1.6 + i * 1.7) * R * 0.4;
            ctx.fillStyle = 'rgba(200, 245, 255,' + (Math.sin(prog * Math.PI) * 0.85).toFixed(3) + ')';
            ctx.beginPath();
            ctx.arc(p.x + swayX, p.y + R * 0.45 - prog * R * 1.5, 1.2 + (1 - prog) * 2, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.font = 'bold 13px Arial';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#2a86aa';
        ctx.shadowBlur = 14;
        ctx.fillStyle = '#ffffff';
        ctx.fillText('PORTAL DOS NEBULOS', p.x, p.y + R + 26);
        ctx.shadowBlur = 8;
        ctx.font = '11px Arial';
        ctx.fillStyle = '#c5ecfa';
        ctx.fillText('Voltar a Davahl', p.x, p.y + R + 39);
        ctx.restore();
    }

    // ============================================================================
    // API
    // ============================================================================
    const api = {
        TILE: TILE,
        NEB_X0: NEB_X0, NEB_X1: NEB_X1, NEB_Y1: NEB_Y1,
        COLS: COLS, ROWS: ROWS,
        ALT_LIVRE: ALT_LIVRE, ALT_PEQUENA: ALT_PEQUENA, ALT_MEDIA: ALT_MEDIA, ALT_ALTA: ALT_ALTA,
        PORTAL_NEBOLOS_RETORNO: PORTAL_NEBOLOS_RETORNO,
        PONTO_CHEGADA: PONTO_CHEGADA,
        NEB_SPAWN: NEB_SPAWN,
        LARGURA_NEBOLOS: NEB_X0,
        FIM_NEBOLOS: NEB_X1,
        ALTO_NEBOLOS: NEB_Y1,
        gerarNebulos: gerarNebulos,
        resetarNebulos: resetarNebulos,
        grid: function () { return grid; },
        isNebulos: isNebulos,
        colideNebulos: colideNebulos,
        colideProjetilNebulos: colideProjetilNebulos,
        infoPortalNebulos: infoPortalNebulos,
        depositarPosicaoSegura: depositarPosicaoSegura,
        desenharCenarioNebulos: desenharCenarioNebulos,
        coletarNebulosSortables: coletarNebulosSortables,
        colideMapaAtivo: colideMapaAtivo,
        colideProjetilMapaAtivo: colideProjetilMapaAtivo,
        onUpdatePosicao: onUpdatePosicao
    };

    if (typeof window !== 'undefined') {
        gerarNebulos();
        nebulosChainAnterior = global.chainMapas;
        global.chainMapas = { onUpdatePosicao: onUpdatePosicao };
        global.desenharCenarioNebulos = desenharCenarioNebulos;
        global.coletarNebulosSortables = coletarNebulosSortables;
        global.colideNebulos = colideNebulos;
        global.colideProjetilNebulos = colideProjetilNebulos;
        global.infoPortalNebulos = infoPortalNebulos;
        prevColide = global.colideMapaAtivo;
        global.colideMapaAtivo = function (x, y, raio) {
            if (global.currentMap === 'nebulos') return !isNebulos(x, y) || colideNebulos(x, y, raio);
            if (isNebulos(x, y)) return false;
            return typeof prevColide === 'function' ? prevColide(x, y, raio) : false;
        };
        prevColideP = global.colideProjetilMapaAtivo;
        global.colideProjetilMapaAtivo = function (x, y) {
            if (global.currentMap === 'nebulos') return !isNebulos(x, y) || colideProjetilNebulos(x, y);
            if (isNebulos(x, y)) return false;
            return typeof prevColideP === 'function' ? prevColideP(x, y) : false;
        };
        global.mapaNebulos = api;
    }

    if (typeof module !== 'undefined' && module.exports) {
        if (!grid) gerarNebulos();
        module.exports = api;
    }

})(typeof window !== 'undefined' ? window : this);
