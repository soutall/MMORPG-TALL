// ============================================================================
// mapa_abissal.js — "Floresta Abissal" (Bioma Sombrio e Bioluminescente)
// Módulo isomórfico: navegador (window) e servidor (module.exports).
//
// MAPA POR ID ÚNICA — coordenadas EXCLUSIVAS:
//   • faixa própria : x em [107600, 117200) × y em [0, 5400).
//   • tile = 40px   → COLS=240, ROWS=135 (9.600 × 5.400 px).
//
// Ambientação:
//   • Santuário do Vazio a oeste com o Portal do Abismo de retorno para Davahl
//   • Caminho das Almas com lajes obsidiana e inscrições rúnicas brilhantes
//   • Grande Clareira dos Cristais Abissais ao centro (spawn em 111220, 2740)
//   • Grande Poço do Vazio / Lago Abissal a leste com pontes rúnicas
//   • Altar dos Antigos ao sudeste e Fenda Sombria ao nordeste
//   • Bosque de árvores ancestrais retorcidas com veios bioluminescentes
//   • Orbes de energia e névoa abissal flutuantes em deriva contínua
// ============================================================================
(function (global) {
    'use strict';

    const TILE = 40;
    const ABI_X0 = 107600;
    const ABI_X1 = 117200;
    const ABI_Y1 = 5400;
    const COLS = (ABI_X1 - ABI_X0) / TILE;   // 240
    const ROWS = ABI_Y1 / TILE;              // 135

    const ALT_LIVRE = 0, ALT_PEQUENA = 1, ALT_MEDIA = 2, ALT_ALTA = 3;
    const TIPOS_ALT = {
        solo_abissal: ALT_LIVRE,
        trilha_abissal: ALT_LIVRE,
        runas_chao: ALT_LIVRE,
        ponte_runica: ALT_LIVRE,
        flor_abissal: ALT_LIVRE,
        cogumelo_abissal: ALT_PEQUENA,
        cristal_pequeno: ALT_PEQUENA,
        pedra_abissal: ALT_PEQUENA,
        arvore_abissal: ALT_MEDIA,
        cristal_abissal: ALT_MEDIA,
        agua_abissal: ALT_MEDIA,
        arvore_gigante_abissal: ALT_ALTA,
        obelisco_vazio: ALT_ALTA
    };

    // Centro da clareira de cristais (spawn seguro) e portal de retorno
    const CC = 120, CL = 67;
    const ABI_SPAWN = { x: ABI_X0 + (COLS * TILE) / 2, y: ABI_Y1 / 2 };
    const PONTO_CHEGADA = { x: ABI_SPAWN.x, y: ABI_SPAWN.y };
    // Portal de retorno a oeste (longe do spawn por > 3400px)
    const PORTAL_ABISSAL_RETORNO = null; // Portal de retorno para a cidade desativado no design atual.

    let grid = null;
    let abissalChainAnterior = null;
    let prevColide = null;
    let prevColideP = null;

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

    function limparClareira(cc, cl, raio, tipoChao) {
        for (let l = cl - raio; l <= cl + raio; l++) {
            for (let c = cc - raio; c <= cc + raio; c++) {
                if (l <= 2 || l >= ROWS - 3 || c <= 2 || c >= COLS - 3) continue;
                const d = Math.hypot(c - cc, l - cl);
                if (d <= raio) {
                    const t = tipoEm(c, l);
                    if (t !== 'agua_abissal' && t !== 'ponte_runica') {
                        marcar(c, l, tipoChao || 'solo_abissal');
                    }
                }
            }
        }
    }

    function trilhaDiag(cA, lA, cB, lB, tipoTrilha) {
        const passos = Math.max(Math.abs(cB - cA), Math.abs(lB - lA));
        const tipoUso = tipoTrilha || 'trilha_abissal';
        for (let i = 0; i <= passos; i++) {
            const c = Math.round(cA + (cB - cA) * i / passos);
            const l = Math.round(lA + (lB - lA) * i / passos);
            for (let dc = 0; dc < 2; dc++) {
                for (let dl = 0; dl < 2; dl++) {
                    const t = tipoEm(c + dc, l + dl);
                    if (t === 'agua_abissal') marcar(c + dc, l + dl, 'ponte_runica');
                    else if (t !== 'arvore_gigante_abissal' && t !== 'ponte_runica' && t !== 'obelisco_vazio') {
                        marcar(c + dc, l + dl, tipoUso);
                    }
                }
            }
        }
    }

    // ============================================================================
    // GERAÇÃO PROCEDURAL DETERMINÍSTICA DO GRID DA FLORESTA ABISSAL
    // ============================================================================
    function gerarAbissal() {
        if (grid) return grid;
        grid = [];
        for (let l = 0; l < ROWS; l++) {
            grid[l] = [];
            for (let c = 0; c < COLS; c++) {
                grid[l][c] = { tipo: 'solo_abissal', alt: ALT_LIVRE };
            }
        }

        // 1. Selo de borda (árvores gigantes abissais e pedras negras)
        for (let l = 0; l < ROWS; l++) {
            marcar(0, l, 'arvore_gigante_abissal');
            marcar(1, l, 'arvore_gigante_abissal');
            marcar(COLS - 1, l, 'arvore_gigante_abissal');
            marcar(COLS - 2, l, 'arvore_gigante_abissal');
        }
        for (let c = 0; c < COLS; c++) {
            marcar(c, 0, 'arvore_gigante_abissal');
            marcar(c, 1, 'arvore_gigante_abissal');
            marcar(c, ROWS - 1, 'arvore_gigante_abissal');
            marcar(c, ROWS - 2, 'arvore_gigante_abissal');
        }

        // 2. Lago Abissal / Poço do Vazio a leste (cols 140..175, rows 35..95)
        for (let l = 30; l <= 100; l++) {
            const curvL = Math.sin(l * 0.08) * 6;
            const centroLago = 158 + Math.round(curvL);
            const raioHorizontal = Math.round(18 + Math.cos(l * 0.05) * 6);
            for (let c = centroLago - raioHorizontal; c <= centroLago + raioHorizontal; c++) {
                if (c > 2 && c < COLS - 3 && l > 2 && l < ROWS - 3) {
                    marcar(c, l, 'agua_abissal');
                }
            }
        }

        // 3. Clareiras Temáticas
        // a) Santuário do Vazio (Oeste / Portal de retorno)
        limparClareira(4, 68, 7, 'runas_chao');
        // b) Clareira Central dos Cristais (Spawn)
        limparClareira(CC, CL, 12, 'solo_abissal');
        limparClareira(CC, CL, 5, 'runas_chao');
        // c) Altar dos Antigos (Sudeste)
        limparClareira(205, 95, 9, 'runas_chao');
        // d) Fenda Sombria (Nordeste)
        limparClareira(208, 28, 8, 'solo_abissal');
        // e) Bosque de Cogumelos (Noroeste)
        limparClareira(45, 32, 9, 'solo_abissal');
        // f) Posto de Vigia Abissal (Sudoeste)
        limparClareira(42, 105, 8, 'solo_abissal');

        // 4. Trilhas Conectando as Regiões
        // Portal oeste -> Bosque de Cogumelos -> Clareira Central
        trilhaDiag(4, 68, 45, 32);
        trilhaDiag(45, 32, CC, CL);
        // Portal oeste direto -> Clareira Central
        trilhaDiag(4, 68, CC, CL);
        // Portal oeste -> Posto Sudoeste -> Clareira Central
        trilhaDiag(4, 68, 42, 105);
        trilhaDiag(42, 105, CC, CL);
        // Clareira Central -> Ponte 1 do Lago -> Fenda Sombria
        trilhaDiag(CC, CL, 140, 52);
        trilhaDiag(140, 52, 178, 52, 'ponte_runica');
        trilhaDiag(178, 52, 208, 28);
        // Clareira Central -> Ponte 2 do Lago -> Altar dos Antigos
        trilhaDiag(CC, CL, 142, 80);
        trilhaDiag(142, 80, 176, 80, 'ponte_runica');
        trilhaDiag(176, 80, 205, 95);

        // 5. Vegetação e Elementos Procedurais
        for (let l = 2; l < ROWS - 2; l++) {
            for (let c = 2; c < COLS - 2; c++) {
                const tipoAtual = grid[l][c].tipo;
                if (tipoAtual !== 'solo_abissal') continue;

                const h = hash2(c * 47, l * 83);
                const distCentro = Math.hypot(c - CC, l - CL);
                const borda = Math.min(c, COLS - 1 - c, l, ROWS - 1 - l);

                // Bordas mais densas de árvores gigantes
                if (borda < 7 && h > 0.35) {
                    marcar(c, l, 'arvore_gigante_abissal');
                    continue;
                }

                // Densidade de árvores normais
                if (distCentro > 14 && h < 0.22) {
                    marcar(c, l, 'arvore_abissal');
                } else if (h >= 0.22 && h < 0.27) {
                    marcar(c, l, 'cogumelo_abissal');
                } else if (h >= 0.27 && h < 0.32) {
                    marcar(c, l, 'cristal_abissal');
                } else if (h >= 0.32 && h < 0.36) {
                    marcar(c, l, 'cristal_pequeno');
                } else if (h >= 0.36 && h < 0.40) {
                    marcar(c, l, 'pedra_abissal');
                } else if (h >= 0.40 && h < 0.47) {
                    marcar(c, l, 'flor_abissal');
                }
            }
        }

        // 6. Estruturas Especiais Marcadas no Grid
        // Obelisco Central posicionado ao norte da clareira (spawn livre no centro)
        marcar(CC, CL - 6, 'obelisco_vazio');
        marcar(CC - 4, CL - 6, 'cristal_abissal');
        marcar(CC + 4, CL - 6, 'cristal_abissal');

        // Garante que o spawn central (CC, CL) e seu entorno fiquem 100% livres
        limparClareira(CC, CL, 4, 'runas_chao');

        // Totens do Santuário Oeste
        marcar(4, 65, 'cristal_abissal');
        marcar(4, 71, 'cristal_abissal');

        // Altar dos Antigos
        marcar(205, 95, 'obelisco_vazio');
        marcar(202, 95, 'cristal_abissal');
        marcar(208, 95, 'cristal_abissal');

        return grid;
    }

    // ============================================================================
    // COLISÃO E FÍSICA ISOMÓRFICA
    // ============================================================================
    function isAbissal(x, y) {
        return x >= ABI_X0 && x < ABI_X1 && y >= 0 && y < ABI_Y1;
    }

    function colideAbissal(x, y, raio) {
        if (!grid) gerarAbissal();
        const r = typeof raio === 'number' ? raio : 14;
        if (x - r < ABI_X0 || x + r >= ABI_X1 || y - r < 0 || y + r >= ABI_Y1) return true;

        const cMin = Math.max(0, Math.floor((x - r - ABI_X0) / TILE));
        const cMax = Math.min(COLS - 1, Math.floor((x + r - ABI_X0) / TILE));
        const lMin = Math.max(0, Math.floor((y - r) / TILE));
        const lMax = Math.min(ROWS - 1, Math.floor((y + r) / TILE));

        for (let l = lMin; l <= lMax; l++) {
            for (let c = cMin; c <= cMax; c++) {
                const cell = grid[l][c];
                if (!cell || cell.alt === ALT_LIVRE) continue;

                const bx0 = ABI_X0 + c * TILE, bx1 = bx0 + TILE;
                const by0 = l * TILE, by1 = by0 + TILE;
                const cx = Math.max(bx0, Math.min(x, bx1));
                const cy = Math.max(by0, Math.min(y, by1));
                if (Math.hypot(x - cx, y - cy) < r) return true;
            }
        }
        return false;
    }

    function colideProjetilAbissal(x, y) {
        if (!grid) gerarAbissal();
        if (x < ABI_X0 || x >= ABI_X1 || y < 0 || y >= ABI_Y1) return true;
        const c = Math.floor((x - ABI_X0) / TILE);
        const l = Math.floor(y / TILE);
        if (c < 0 || c >= COLS || l < 0 || l >= ROWS) return true;
        const cell = grid[l][c];
        if (!cell) return true;
        // Projétil atravessa água abissal e obstáculos baixos, mas colide com árvores/obeliscos
        return cell.tipo === 'arvore_abissal' || cell.tipo === 'arvore_gigante_abissal' || cell.tipo === 'obelisco_vazio' || cell.tipo === 'cristal_abissal';
    }

    function infoPortalAbissal(x, y) {
        if (global.currentMap !== 'abissal') return null;
        if (PORTAL_ABISSAL_RETORNO && Math.hypot(x - PORTAL_ABISSAL_RETORNO.x, y - PORTAL_ABISSAL_RETORNO.y) < PORTAL_ABISSAL_RETORNO.r) {
            return { via: 'portal', mapa: 'cidade', alvo: PORTAL_ABISSAL_RETORNO.alvo };
        }
        return null;
    }

    function onUpdatePosicao(x, y) {
        if (global.estaMorto) return;
        if (typeof global.portalMapaPodeDisparar === 'function' && !global.portalMapaPodeDisparar(x, y)) return;
        let info = null;
        if (x >= ABI_X0 && x < ABI_X1) {
            info = infoPortalAbissal(x, y);
        } else if (abissalChainAnterior && typeof abissalChainAnterior.onUpdatePosicao === 'function') {
            abissalChainAnterior.onUpdatePosicao(x, y);
            return;
        }
        if (!info) return;
        if (typeof global.solicitarTeleporteMapa === 'function') {
            global.solicitarTeleporteMapa(info.mapa, 'abissal_' + info.mapa);
        }
    }

    function coletarAbissalSortables(t, arr) {
        // Objetos colocados via Editor Admin são automaticamente coletados por coletarObjetosMapa
    }

    // ============================================================================
    // RENDERIZAÇÃO GRÁFICA CLIENTE (CANVAS 2D DUAL PC/MOBILE A 60 FPS)
    // ============================================================================
    function desenharCenarioAbissal(t) {
        const ctx = global.ctx;
        if (!ctx) return;
        if (!grid) gerarAbissal();

        const camX = global.camX || 0, camY = global.camY || 0;
        const cw = ((global.canvas && global.canvas.width) || 900) / (global.ZOOM_CAMERA || 1);
        const ch = ((global.canvas && global.canvas.height) || 600) / (global.ZOOM_CAMERA || 1);

        const c0 = Math.max(0, Math.floor((camX - ABI_X0 - 240) / TILE));
        const c1 = Math.min(COLS - 1, Math.ceil((camX - ABI_X0 + cw + 240) / TILE));
        const l0 = Math.max(0, Math.floor((camY - 260) / TILE));
        const l1 = Math.min(ROWS - 1, Math.ceil((camY + ch + 260) / TILE));

        // ---------- PASSO 1: CHÃO / ÁGUA / TRILHAS ----------
        for (let l = l0; l <= l1; l++) {
            for (let c = c0; c <= c1; c++) {
                const x = ABI_X0 + c * TILE, y = l * TILE;
                const tl = grid[l][c].tipo;
                const h = hash2(c * 23, l * 41);

                if (tl === 'agua_abissal') {
                    // Água abissal profunda com brilho etéreo
                    const g = ctx.createLinearGradient(x, y, x, y + TILE);
                    g.addColorStop(0, '#0a0d24');
                    g.addColorStop(1, '#150c2e');
                    ctx.fillStyle = g;
                    ctx.fillRect(x, y, TILE, TILE);

                    const onda = Math.sin(t * 1.5 + (c * 0.7 + l * 0.5)) * 0.5 + 0.5;
                    ctx.fillStyle = 'rgba(70, 230, 210, ' + (0.08 + onda * 0.12).toFixed(3) + ')';
                    ctx.fillRect(x, y + 4 + onda * 12, TILE, 3);
                    ctx.fillStyle = 'rgba(180, 80, 240, ' + (onda * 0.10).toFixed(3) + ')';
                    ctx.fillRect(x + 4, y + TILE - 8, TILE * 0.4, 2);
                } else if (tl === 'ponte_runica') {
                    // Lajes de obsidiana com frisos rúnicos ciano
                    ctx.fillStyle = '#181524';
                    ctx.fillRect(x, y, TILE, TILE);
                    ctx.strokeStyle = '#22ebd0';
                    ctx.lineWidth = 1.5;
                    ctx.strokeRect(x + 2, y + 2, TILE - 4, TILE - 4);
                    ctx.fillStyle = 'rgba(40, 240, 210, 0.2)';
                    ctx.fillRect(x + 8, y + 8, TILE - 16, TILE - 16);
                } else if (tl === 'runas_chao') {
                    // Solo de santuário rúnico
                    ctx.fillStyle = '#1a132e';
                    ctx.fillRect(x, y, TILE, TILE);
                    const pulsoRuna = (Math.sin(t * 2.0 + h * 6.28) * 0.5 + 0.5);
                    ctx.fillStyle = 'rgba(160, 80, 250, ' + (0.15 + pulsoRuna * 0.25).toFixed(3) + ')';
                    ctx.beginPath();
                    ctx.arc(x + TILE / 2, y + TILE / 2, 7 + pulsoRuna * 3, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = 'rgba(70, 235, 215, 0.4)';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(x + 4, y + 4, TILE - 8, TILE - 8);
                } else if (tl === 'trilha_abissal') {
                    // Trilha de pedra escura
                    ctx.fillStyle = '#1c162b';
                    ctx.fillRect(x, y, TILE, TILE);
                    ctx.fillStyle = 'rgba(110, 60, 180, 0.18)';
                    if (h > 0.5) ctx.fillRect(x + 6, y + 8, 10, 5);
                    if (h < 0.3) ctx.fillRect(x + 20, y + 22, 12, 4);
                } else {
                    // Solo abissal com tons de púrpura profundo e musgo sombrio
                    const tons = ['#0e0a1a', '#130d24', '#100b1e'];
                    ctx.fillStyle = tons[Math.floor(h * 3) % 3];
                    ctx.fillRect(x, y, TILE, TILE);

                    if (tl === 'flor_abissal') {
                        // Flor bioluminescente
                        const pulsoFlor = Math.sin(t * 2.5 + h * 6.28) * 0.5 + 0.5;
                        ctx.fillStyle = h > 0.5 ? 'rgba(50, 240, 210, ' + (0.6 + pulsoFlor * 0.4).toFixed(3) + ')' : 'rgba(215, 90, 245, ' + (0.6 + pulsoFlor * 0.4).toFixed(3) + ')';
                        ctx.beginPath();
                        ctx.arc(x + 12 + h * 16, y + 14 + h * 12, 2.5, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            }
        }

        // ---------- PASSO 2: ÁRVORES, CRISTAIS E ESTRUTURAS DO GRID ----------
        for (let l = l0; l <= l1; l++) {
            for (let c = c0; c <= c1; c++) {
                const x = ABI_X0 + c * TILE, y = l * TILE;
                const tl = grid[l][c].tipo;
                const cxTile = x + TILE / 2, cyBase = y + TILE - 4;
                const h = hash2(c * 19, l * 47);

                if (tl === 'arvore_abissal' || tl === 'arvore_gigante_abissal') {
                    const gig = tl === 'arvore_gigante_abissal';
                    const escala = gig ? 1.85 : (0.9 + h * 0.35);
                    const fase = h * Math.PI * 2;
                    const balanco = Math.sin(t * 1.2 + fase) * (gig ? 3.0 : 2.0);

                    // Sombra no chão
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
                    ctx.beginPath();
                    ctx.ellipse(cxTile, cyBase + 2, 14 * escala, 6 * escala, 0, 0, Math.PI * 2);
                    ctx.fill();

                    // Tronco retorcido de obsidiana
                    ctx.fillStyle = '#1c152a';
                    ctx.fillRect(cxTile - 4 * escala, cyBase - 26 * escala, 8 * escala, 26 * escala);
                    ctx.fillStyle = 'rgba(40, 220, 200, 0.35)'; // estria bioluminescente
                    ctx.fillRect(cxTile - 1 * escala, cyBase - 22 * escala, 2 * escala, 18 * escala);

                    // Copa com folhagem abissal púrpura/violeta
                    const coresCopa = gig ? ['#1b0c36', '#2b1352', '#3d1c72'] : ['#221045', '#331766', '#49228e'];
                    for (let k = 0; k < 3; k++) {
                        const rr = (gig ? 27 : 17) * escala - k * 6 * escala;
                        const yy = cyBase - (gig ? 42 : 30) * escala - k * 12 * escala;
                        ctx.fillStyle = coresCopa[k];
                        ctx.beginPath();
                        ctx.ellipse(cxTile + balanco * (0.4 + k * 0.3), yy, rr, rr * 0.82, 0, 0, Math.PI * 2);
                        ctx.fill();

                        // Pontos cintilantes de seiva na copa
                        if (k === 2) {
                            ctx.fillStyle = 'rgba(60, 240, 220, 0.8)';
                            ctx.beginPath();
                            ctx.arc(cxTile + balanco - 4, yy - 3, 1.8, 0, Math.PI * 2);
                            ctx.arc(cxTile + balanco + 6, yy + 2, 1.5, 0, Math.PI * 2);
                            ctx.fill();
                        }
                    }
                } else if (tl === 'cristal_abissal' || tl === 'cristal_pequeno') {
                    const grande = tl === 'cristal_abissal';
                    const hC = grande ? 36 : 20;
                    const wC = grande ? 14 : 8;
                    const pulsoC = Math.sin(t * 2.2 + h * 6.28) * 0.5 + 0.5;

                    // Halo de luz ambiente do cristal
                    const gHalo = ctx.createRadialGradient(cxTile, cyBase - hC / 2, 2, cxTile, cyBase - hC / 2, grande ? 48 : 26);
                    gHalo.addColorStop(0, 'rgba(50, 235, 215, ' + (0.25 + pulsoC * 0.15).toFixed(3) + ')');
                    gHalo.addColorStop(1, 'rgba(15, 10, 30, 0)');
                    ctx.fillStyle = gHalo;
                    ctx.beginPath();
                    ctx.arc(cxTile, cyBase - hC / 2, grande ? 48 : 26, 0, Math.PI * 2);
                    ctx.fill();

                    // Cristal facetado
                    ctx.fillStyle = '#1d5e68';
                    ctx.beginPath();
                    ctx.moveTo(cxTile, cyBase - hC);
                    ctx.lineTo(cxTile + wC / 2, cyBase);
                    ctx.lineTo(cxTile - wC / 2, cyBase);
                    ctx.closePath();
                    ctx.fill();

                    ctx.fillStyle = 'rgba(70, 245, 230, ' + (0.6 + pulsoC * 0.4).toFixed(3) + ')';
                    ctx.beginPath();
                    ctx.moveTo(cxTile, cyBase - hC);
                    ctx.lineTo(cxTile + wC / 2, cyBase);
                    ctx.lineTo(cxTile, cyBase);
                    ctx.closePath();
                    ctx.fill();
                } else if (tl === 'cogumelo_abissal') {
                    const pulsoM = Math.sin(t * 1.8 + h * 6.28) * 0.5 + 0.5;
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
                    ctx.beginPath();
                    ctx.ellipse(cxTile, cyBase + 1, 10, 4, 0, 0, Math.PI * 2);
                    ctx.fill();

                    // Haste
                    ctx.fillStyle = '#261b3d';
                    ctx.fillRect(cxTile - 2, cyBase - 12, 4, 12);

                    // Chapéu bioluminescente
                    ctx.fillStyle = h > 0.5 ? 'rgba(215, 80, 245, 0.9)' : 'rgba(50, 230, 210, 0.9)';
                    ctx.beginPath();
                    ctx.ellipse(cxTile, cyBase - 12, 10, 7, 0, Math.PI, Math.PI * 2);
                    ctx.fill();

                    // Pontos brilhantes
                    ctx.fillStyle = '#ffffff';
                    ctx.beginPath();
                    ctx.arc(cxTile - 4, cyBase - 14, 1.2, 0, Math.PI * 2);
                    ctx.arc(cxTile + 4, cyBase - 14, 1.2, 0, Math.PI * 2);
                    ctx.arc(cxTile, cyBase - 17, 1.4, 0, Math.PI * 2);
                    ctx.fill();
                } else if (tl === 'obelisco_vazio') {
                    // Grande monólito do Vazio no centro das clareiras
                    const pulsoO = Math.sin(t * 1.6) * 0.5 + 0.5;
                    // Sombra
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                    ctx.beginPath();
                    ctx.ellipse(cxTile, cyBase + 2, 20, 8, 0, 0, Math.PI * 2);
                    ctx.fill();

                    // Monólito de pedra negra
                    ctx.fillStyle = '#150f24';
                    ctx.beginPath();
                    ctx.moveTo(cxTile, cyBase - 65);
                    ctx.lineTo(cxTile + 12, cyBase);
                    ctx.lineTo(cxTile - 12, cyBase);
                    ctx.closePath();
                    ctx.fill();

                    // Fenda de luz no centro do monólito
                    ctx.strokeStyle = 'rgba(60, 240, 220, ' + (0.7 + pulsoO * 0.3).toFixed(3) + ')';
                    ctx.lineWidth = 2.5;
                    ctx.beginPath();
                    ctx.moveTo(cxTile, cyBase - 52);
                    ctx.lineTo(cxTile, cyBase - 8);
                    ctx.stroke();

                    // Brilho místico
                    const gOb = ctx.createRadialGradient(cxTile, cyBase - 35, 4, cxTile, cyBase - 35, 70);
                    gOb.addColorStop(0, 'rgba(160, 70, 250, ' + (0.25 + pulsoO * 0.2).toFixed(3) + ')');
                    gOb.addColorStop(1, 'rgba(10, 5, 20, 0)');
                    ctx.fillStyle = gOb;
                    ctx.beginPath();
                    ctx.arc(cxTile, cyBase - 35, 70, 0, Math.PI * 2);
                    ctx.fill();
                } else if (tl === 'pedra_abissal') {
                    ctx.fillStyle = 'rgba(0,0,0,0.3)';
                    ctx.beginPath(); ctx.ellipse(cxTile, cyBase + 2, 11, 5, 0, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = '#2d2440';
                    ctx.beginPath();
                    ctx.moveTo(x + 8, y + 30); ctx.lineTo(x + 14, y + 16); ctx.lineTo(x + 28, y + 14);
                    ctx.lineTo(x + 34, y + 28); ctx.lineTo(x + 22, y + 34); ctx.closePath(); ctx.fill();
                }
            }
        }

        // ---------- PASSO 3: NÉVOA E ORBES ABISSAIS EM DERIVA ----------
        for (let i = 0; i < 24; i++) {
            const seedX = hash2(i * 37, 101);
            const seedY = hash2(i * 59, 203);
            const motX = ABI_X0 + ((seedX * (ABI_X1 - ABI_X0) + t * 24 * (0.8 + seedY)) % (ABI_X1 - ABI_X0));
            const motY = ((seedY * ABI_Y1 + Math.sin(t * 0.8 + i) * 60) % ABI_Y1);

            if (motX >= camX - 40 && motX <= camX + cw + 40 && motY >= camY - 40 && motY <= camY + ch + 40) {
                const pulso = Math.sin(t * 2.0 + i) * 0.5 + 0.5;
                ctx.fillStyle = i % 2 === 0 ? 'rgba(70, 240, 220, ' + (0.3 + pulso * 0.4).toFixed(3) + ')' : 'rgba(210, 90, 255, ' + (0.3 + pulso * 0.4).toFixed(3) + ')';
                ctx.beginPath();
                ctx.arc(motX, motY, 2.0 + pulso * 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // ---------- PASSO 4: PORTAL DO ABISMO (RETORNO A DAVAHL) ----------
        desenharPortalAbissal(ctx, t, camX, camY, cw, ch);
    }

    // ---- Portal do Abismo (Vórtice Cósmico / Void Vortex) ----
    function desenharPortalAbissal(ctx, t, camX, camY, cw, ch) {
        const p = PORTAL_ABISSAL_RETORNO;
        if (!p) return;
        if (p.x + p.r + 140 < camX || p.x - p.r - 140 > camX + cw || p.y + p.r + 140 < camY || p.y - p.r - 140 > camY + ch) return;

        const pulsar = 1 + Math.sin(t * 2.4) * 0.07;
        const R = p.r * pulsar;
        ctx.save();

        // 1. Halo cósmico externo
        const haloR = R * 1.9 + Math.sin(t * 3.0) * 5;
        const gHalo = ctx.createRadialGradient(p.x, p.y, R * 0.3, p.x, p.y, haloR);
        gHalo.addColorStop(0, 'rgba(170, 70, 255, 0.22)');
        gHalo.addColorStop(0.5, 'rgba(40, 220, 210, 0.12)');
        gHalo.addColorStop(1, 'rgba(10, 5, 25, 0)');
        ctx.fillStyle = gHalo;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, haloR, haloR * 0.65, 0, 0, Math.PI * 2);
        ctx.fill();

        // 2. Anéis rúnicos rotativos tracejados
        ctx.strokeStyle = 'rgba(70, 240, 220, 0.9)';
        ctx.lineWidth = 3;
        ctx.setLineDash([R * 0.5, R * 0.25]);
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, R * 1.3, R * 0.7, t * 1.1, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(195, 80, 255, 0.85)';
        ctx.lineWidth = 2;
        ctx.setLineDash([R * 0.35, R * 0.35]);
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, R * 1.45, R * 0.75, -t * 0.8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // 3. Vórtice central do Vazio
        const gV = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, R);
        gV.addColorStop(0, 'rgba(255, 255, 255, 0.98)');
        gV.addColorStop(0.25, 'rgba(90, 240, 220, 0.9)');
        gV.addColorStop(0.65, 'rgba(130, 45, 220, 0.75)');
        gV.addColorStop(1, 'rgba(15, 8, 35, 0.5)');
        ctx.fillStyle = gV;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, R, R * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();

        // 4. Partículas espirais
        for (let i = 0; i < 12; i++) {
            const prog = (t * 0.9 + i / 12) % 1;
            const ang = t * 2.0 + i * (Math.PI / 6);
            const distP = (1 - prog) * R;
            const px = p.x + Math.cos(ang) * distP;
            const py = p.y + Math.sin(ang) * distP * 0.55;
            ctx.fillStyle = i % 2 === 0 ? 'rgba(80, 245, 230, ' + (prog).toFixed(3) + ')' : 'rgba(230, 110, 255, ' + (prog).toFixed(3) + ')';
            ctx.beginPath();
            ctx.arc(px, py, 1.4 + prog * 2, 0, Math.PI * 2);
            ctx.fill();
        }

        // 5. Letreiro visual
        ctx.font = 'bold 13px Arial';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#a846f7';
        ctx.shadowBlur = 14;
        ctx.fillStyle = '#ffffff';
        ctx.fillText('PORTAL DO ABISMO', p.x, p.y + R + 26);
        ctx.shadowBlur = 8;
        ctx.font = '11px Arial';
        ctx.fillStyle = '#8cefe4';
        ctx.fillText('Voltar a Davahl', p.x, p.y + R + 40);

        ctx.restore();
    }

    // ============================================================================
    // EXPORTAÇÃO DA API ISOMÓRFICA
    // ============================================================================
    const api = {
        TILE: TILE,
        ABI_X0: ABI_X0, ABI_X1: ABI_X1, ABI_Y1: ABI_Y1,
        COLS: COLS, ROWS: ROWS,
        ALT_LIVRE: ALT_LIVRE, ALT_PEQUENA: ALT_PEQUENA, ALT_MEDIA: ALT_MEDIA, ALT_ALTA: ALT_ALTA,
        PORTAL_ABISSAL_RETORNO: PORTAL_ABISSAL_RETORNO,
        PONTO_CHEGADA: PONTO_CHEGADA,
        ABI_SPAWN: ABI_SPAWN,
        LARGURA_ABISSAL: ABI_X0,
        FIM_ABISSAL: ABI_X1,
        ALTO_ABISSAL: ABI_Y1,
        gerarAbissal: gerarAbissal,
        grid: function () { return grid; },
        isAbissal: isAbissal,
        colideAbissal: colideAbissal,
        colideProjetilAbissal: colideProjetilAbissal,
        infoPortalAbissal: infoPortalAbissal,
        desenharCenarioAbissal: desenharCenarioAbissal,
        coletarAbissalSortables: coletarAbissalSortables,
        onUpdatePosicao: onUpdatePosicao
    };

    if (typeof window !== 'undefined') {
        gerarAbissal();
        abissalChainAnterior = global.chainMapas;
        global.chainMapas = { onUpdatePosicao: onUpdatePosicao };
        global.desenharCenarioAbissal = desenharCenarioAbissal;
        global.coletarAbissalSortables = coletarAbissalSortables;
        global.colideAbissal = colideAbissal;
        global.colideProjetilAbissal = colideProjetilAbissal;
        global.infoPortalAbissal = infoPortalAbissal;

        prevColide = global.colideMapaAtivo;
        global.colideMapaAtivo = function (x, y, raio) {
            if (global.currentMap === 'abissal') return !isAbissal(x, y) || colideAbissal(x, y, raio);
            if (isAbissal(x, y)) return false;
            return typeof prevColide === 'function' ? prevColide(x, y, raio) : false;
        };

        prevColideP = global.colideProjetilMapaAtivo;
        global.colideProjetilMapaAtivo = function (x, y) {
            if (global.currentMap === 'abissal') return !isAbissal(x, y) || colideProjetilAbissal(x, y);
            if (isAbissal(x, y)) return false;
            return typeof prevColideP === 'function' ? prevColideP(x, y) : false;
        };

        global.mapaAbissal = api;
    }

    if (typeof module !== 'undefined' && module.exports) {
        if (!grid) gerarAbissal();
        module.exports = api;
    }

})(typeof window !== 'undefined' ? window : this);
