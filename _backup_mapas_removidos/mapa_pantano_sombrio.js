// ============================================================================
// mapa_pantano_sombrio.js — "Pântano Sombrio" (Bioma de Pântano Criado do Zero)
// Módulo isomórfico: navegador (window) e servidor (module.exports).
//
// MAPA POR ID ÚNICA — coordenadas EXCLUSIVAS:
//   • faixa própria : x em [117200, 126800) × y em [0, 5400).
//   • tile = 40px   → COLS=240, ROWS=135 (9.600 × 5.400 px).
//
// Ambientação criada do zero:
//   • Vila dos Pescadores de Palafitas no centro (spawn seguro em 121200, 2700)
//   • 4 Cabanas de madeira rústica sobre palafitas com janelas quentes e fumaça
//   • Fogueira Comunal da Vila com pedras e iluminação suave por gradiente radial
//   • Grande Lago das Brumas a leste com águas reflexivas e pontes de madeira
//   • Bosque dos Ciprestes Ancestrais com raízes aéreas ("joelhos") e salgueiros
//   • Barba-de-velho pendente ondulando suavemente na brisa do pântano
//   • Santuário das Runas a oeste com o Portal de Retorno seguro para Davahl
//   • Terreno orgânico contínuo sem blocos/tiles quadriculados artificiais
// ============================================================================
(function (global) {
    'use strict';

    const TILE = 40;
    const PANT_X0 = 117200;
    const PANT_X1 = 126800;
    const PANT_Y1 = 5400;
    const COLS = (PANT_X1 - PANT_X0) / TILE;   // 240
    const ROWS = PANT_Y1 / TILE;              // 135

    const ALT_LIVRE = 0, ALT_PEQUENA = 1, ALT_MEDIA = 2, ALT_ALTA = 3;
    const TIPOS_ALT = {
        lodo_solo: ALT_LIVRE,
        trilha_pantano: ALT_LIVRE,
        passarela_madeira: ALT_LIVRE,
        grama_pantano: ALT_LIVRE,
        ponte_pantano: ALT_LIVRE,
        flor_loto: ALT_LIVRE,
        taboa_pequena: ALT_LIVRE,
        cogumelo_lodo: ALT_PEQUENA,
        tronco_caido: ALT_PEQUENA,
        pedra_musgosa: ALT_PEQUENA,
        joelho_cipreste: ALT_PEQUENA,
        arvore_cipreste: ALT_MEDIA,
        salgueiro_chorao: ALT_MEDIA,
        agua_pantano: ALT_MEDIA,
        cabana_palafita: ALT_ALTA,
        muralha_cipreste_denso: ALT_ALTA
    };

    // Centro da Vila das Palafitas (spawn seguro e espaçoso)
    const CC = 120, CL = 67;
    const PANT_SPAWN = { x: PANT_X0 + 4800, y: 2700 };
    const PONTO_CHEGADA = { x: 122000, y: 2700 };

    // Portal de retorno a oeste (distância de segurança > 3600px do spawn)
    const PORTAL_PANTANO_RETORNO = null; // Portal de retorno para a cidade desativado no design atual.

    // Estruturas da Vila dos Pescadores
    const VILA_CABANAS = [
        { x: PANT_SPAWN.x - 150, y: PANT_SPAWN.y - 180, w: 130, h: 90, nome: 'Cabana do Velho Pescador' },
        { x: PANT_SPAWN.x + 150, y: PANT_SPAWN.y - 180, w: 120, h: 85, nome: 'Cabana do Herbalista do Lodo' },
        { x: PANT_SPAWN.x + 160, y: PANT_SPAWN.y + 150, w: 135, h: 95, nome: 'Armazém de Barcos e Redes' },
        { x: PANT_SPAWN.x - 160, y: PANT_SPAWN.y + 150, w: 115, h: 80, nome: 'Cabana do Caçador de Rãs' }
    ];

    // Fogueira Comunal da Vila (Aconchegante no centro norte da praça)
    const FOGUEIRA_COMUNAL = { x: PANT_SPAWN.x, y: PANT_SPAWN.y - 90, rCol: 20 };

    // Lago das Brumas a leste (cols 135 a 215, rows 30 a 105)
    const LAGO_BRUMAS = {
        cx: 175,
        cy: 68,
        rx: 38,
        ry: 26
    };

    let grid = null;
    let pantanoChainAnterior = null;
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

    function limparArea(cc, cl, raio, tipoChao) {
        for (let l = cl - raio; l <= cl + raio; l++) {
            for (let c = cc - raio; c <= cc + raio; c++) {
                if (l <= 2 || l >= ROWS - 3 || c <= 2 || c >= COLS - 3) continue;
                const d = Math.hypot(c - cc, l - cl);
                if (d <= raio) {
                    const t = tipoEm(c, l);
                    if (t !== 'agua_pantano' && t !== 'ponte_pantano') {
                        marcar(c, l, tipoChao || 'lodo_solo');
                    }
                }
            }
        }
    }

    function trilhaDiag(cA, lA, cB, lB, tipoTrilha) {
        const passos = Math.max(Math.abs(cB - cA), Math.abs(lB - lA));
        const tipoUso = tipoTrilha || 'trilha_pantano';
        for (let i = 0; i <= passos; i++) {
            const c = Math.round(cA + (cB - cA) * i / passos);
            const l = Math.round(lA + (lB - lA) * i / passos);
            for (let dc = 0; dc < 3; dc++) {
                for (let dl = 0; dl < 3; dl++) {
                    const t = tipoEm(c + dc, l + dl);
                    if (t === 'agua_pantano') marcar(c + dc, l + dl, 'ponte_pantano');
                    else if (t !== 'muralha_cipreste_denso' && t !== 'ponte_pantano' && t !== 'cabana_palafita') {
                        marcar(c + dc, l + dl, tipoUso);
                    }
                }
            }
        }
    }

    // ============================================================================
    // GERAÇÃO PROCEDURAL DO GRID DO PÂNTANO SOMBRIO
    // ============================================================================
    function gerarPantanoSombrio() {
        if (grid) return grid;
        grid = [];
        for (let l = 0; l < ROWS; l++) {
            grid[l] = [];
            for (let c = 0; c < COLS; c++) {
                grid[l][c] = { tipo: 'lodo_solo', alt: ALT_LIVRE };
            }
        }

        // 1. Muralha densa de ciprestes gigantes nas bordas (selo intransponível)
        for (let l = 0; l < ROWS; l++) {
            for (let c = 0; c < COLS; c++) {
                if (l < 3 || l >= ROWS - 3 || c < 3 || c >= COLS - 3) {
                    marcar(c, l, 'muralha_cipreste_denso');
                } else if (l === 3 || l === ROWS - 4 || c === 3 || c === COLS - 4) {
                    if (hash2(c, l) > 0.3) marcar(c, l, 'muralha_cipreste_denso');
                }
            }
        }

        // 2. Grande Lago das Brumas a leste
        for (let l = 15; l < ROWS - 15; l++) {
            for (let c = 120; c < COLS - 15; c++) {
                const dx = (c - LAGO_BRUMAS.cx) / LAGO_BRUMAS.rx;
                const dy = (l - LAGO_BRUMAS.cy) / LAGO_BRUMAS.ry;
                const distL = Math.hypot(dx, dy);
                if (distL <= 0.85) {
                    marcar(c, l, 'agua_pantano');
                } else if (distL <= 1.05 && hash2(c * 7, l * 11) > 0.45) {
                    marcar(c, l, 'agua_pantano');
                }
            }
        }

        // Braço secundário do lago (pântano raso ao sul)
        for (let l = 85; l < 120; l++) {
            for (let c = 60; c < 110; c++) {
                const distR = Math.hypot((c - 85) / 20, (l - 100) / 14);
                if (distR <= 0.75) {
                    marcar(c, l, 'agua_pantano');
                }
            }
        }

        // 3. Limpeza das clareiras principais
        // A. Clareira da Vila dos Pescadores
        limparArea(CC, CL, 14, 'passarela_madeira');
        // B. Clareira do Portal a oeste
        limparArea(5, CL, 10, 'grama_pantano');
        // C. Clareira do Píer do Lago a leste
        limparArea(136, CL, 8, 'passarela_madeira');

        // 4. Trilhas orgânicas conectando tudo
        trilhaDiag(5, CL, CC, CL, 'trilha_pantano');
        trilhaDiag(CC, CL, 136, CL, 'passarela_madeira');
        trilhaDiag(CC, CL, 85, 96, 'trilha_pantano');
        trilhaDiag(CC, CL, 100, 30, 'trilha_pantano');

        // 5. Pontes sobre o Grande Lago
        for (let c = 135; c <= 190; c++) {
            if (tipoEm(c, CL) === 'agua_pantano') marcar(c, CL, 'ponte_pantano');
        }

        // 6. Distribuição natural de árvores, ciprestes, salgueiros e vegetação
        for (let l = 4; l < ROWS - 4; l++) {
            for (let c = 4; c < COLS - 4; c++) {
                const tAtual = tipoEm(c, l);
                if (tAtual !== 'lodo_solo') continue;

                const h = hash2(c * 17, l * 31);
                const h2 = hash2(c * 53, l * 79);

                // Afastamento seguro do spawn
                if (Math.hypot(c - CC, l - CL) < 10) continue;
                // Afastamento seguro do portal
                if (Math.hypot(c - 5, l - CL) < 8) continue;

                if (h > 0.93) {
                    marcar(c, l, 'arvore_cipreste');
                } else if (h > 0.88) {
                    marcar(c, l, 'salgueiro_chorao');
                } else if (h > 0.83) {
                    marcar(c, l, 'tronco_caido');
                } else if (h > 0.77) {
                    marcar(c, l, 'joelho_cipreste');
                } else if (h > 0.70) {
                    marcar(c, l, 'cogumelo_lodo');
                } else if (h > 0.62) {
                    marcar(c, l, 'taboa_pequena');
                } else if (h2 > 0.75) {
                    marcar(c, l, 'pedra_musgosa');
                }
            }
        }

        // 7. Nenúfares na água
        for (let l = 15; l < ROWS - 15; l++) {
            for (let c = 120; c < COLS - 15; c++) {
                if (tipoEm(c, l) === 'agua_pantano') {
                    if (hash2(c * 23, l * 41) > 0.92) {
                        marcar(c, l, 'flor_loto');
                    }
                }
            }
        }

        return grid;
    }

    function isPantanoSombrio(x, y) {
        return x >= PANT_X0 && x < PANT_X1 && y >= 0 && y < PANT_Y1;
    }

    // ============================================================================
    // COLISÕES DO PÂNTANO SOMBRIO (SERVER-AUTHORITATIVE)
    // ============================================================================
    function colidePantanoSombrio(x, y, raio) {
        if (!isPantanoSombrio(x, y)) return true;
        if (!grid) gerarPantanoSombrio();
        raio = Number(raio) || 12;

        if (x - raio < PANT_X0 + 80 || x + raio >= PANT_X1 - 80 || y - raio < 80 || y + raio >= PANT_Y1 - 80) {
            return true;
        }

        const c0 = Math.max(0, Math.floor((x - PANT_X0 - raio) / TILE));
        const c1 = Math.min(COLS - 1, Math.floor((x - PANT_X0 + raio) / TILE));
        const l0 = Math.max(0, Math.floor((y - raio) / TILE));
        const l1 = Math.min(ROWS - 1, Math.floor((y + raio) / TILE));

        for (let l = l0; l <= l1; l++) {
            for (let c = c0; c <= c1; c++) {
                const cel = grid[l][c];
                if (cel.alt >= ALT_MEDIA) {
                    // Água e pontes: pontes permitem passagem
                    if (cel.tipo === 'agua_pantano') {
                        // Verifica se está sobre uma ponte
                        const cPonte = Math.floor((x - PANT_X0) / TILE);
                        const lPonte = Math.floor(y / TILE);
                        if (cPonte >= 0 && cPonte < COLS && lPonte >= 0 && lPonte < ROWS) {
                            if (grid[lPonte][cPonte].tipo === 'ponte_pantano') continue;
                        }
                        return true;
                    }
                    return true;
                }
            }
        }

        // Colisão com as Cabanas da Vila
        for (let i = 0; i < VILA_CABANAS.length; i++) {
            const cab = VILA_CABANAS[i];
            if (x >= cab.x - cab.w / 2 && x <= cab.x + cab.w / 2 &&
                y >= cab.y - cab.h / 2 && y <= cab.y + cab.h / 2) {
                return true;
            }
        }

        // Colisão com a Fogueira Comunal
        if (Math.hypot(x - FOGUEIRA_COMUNAL.x, y - FOGUEIRA_COMUNAL.y) < (FOGUEIRA_COMUNAL.rCol + raio)) {
            return true;
        }

        return false;
    }

    function colideProjetilPantanoSombrio(x, y) {
        if (!isPantanoSombrio(x, y)) return true;
        if (!grid) gerarPantanoSombrio();
        if (x < PANT_X0 + 80 || x >= PANT_X1 - 80 || y < 80 || y >= PANT_Y1 - 80) return true;

        const c = Math.floor((x - PANT_X0) / TILE);
        const l = Math.floor(y / TILE);
        if (c < 0 || c >= COLS || l < 0 || l >= ROWS) return true;

        const cel = grid[l][c];
        if (cel.tipo === 'muralha_cipreste_denso' || cel.tipo === 'arvore_cipreste') return true;

        for (let i = 0; i < VILA_CABANAS.length; i++) {
            const cab = VILA_CABANAS[i];
            if (x >= cab.x - cab.w / 2 && x <= cab.x + cab.w / 2 &&
                y >= cab.y - cab.h / 2 && y <= cab.y + cab.h / 2) {
                return true;
            }
        }

        return false;
    }

    // ============================================================================
    // PORTAL DE RETORNO DO PÂNTANO SOMBRIO
    // ============================================================================
    function infoPortalPantanoSombrio(x, y) {
        if (!isPantanoSombrio(x, y)) return null;
        if (PORTAL_PANTANO_RETORNO && Math.hypot(x - PORTAL_PANTANO_RETORNO.x, y - PORTAL_PANTANO_RETORNO.y) < PORTAL_PANTANO_RETORNO.r) {
            return { via: 'portal', mapa: 'cidade', alvo: PORTAL_PANTANO_RETORNO.alvo };
        }
        return null;
    }

    function onUpdatePosicao(x, y) {
        if (global.estaMorto) return;
        if (typeof global.portalMapaPodeDisparar === 'function' && !global.portalMapaPodeDisparar(x, y)) return;
        let info = null;
        if (x >= PANT_X0 && x < PANT_X1) {
            info = infoPortalPantanoSombrio(x, y);
        } else if (pantanoChainAnterior && typeof pantanoChainAnterior.onUpdatePosicao === 'function') {
            pantanoChainAnterior.onUpdatePosicao(x, y);
            return;
        }
        if (!info) return;
        if (typeof global.solicitarTeleporteMapa === 'function') {
            global.solicitarTeleporteMapa(info.mapa, 'pantano_sombrio_' + info.mapa);
        }
    }

    // ============================================================================
    // RENDERIZAÇÃO DO CENÁRIO DO PÂNTANO SOMBRIO (SEM QUADRADINHOS)
    // ============================================================================
    function desenharCenarioPantanoSombrio(tempoAnimacao) {
        const ctx = global.ctx;
        if (!ctx) return;
        if (!grid) gerarPantanoSombrio();

        const t = (tempoAnimacao || 0);
        const camX = global.camX || 0;
        const camY = global.camY || 0;
        const zoom = (typeof global.cameraZoomAtual === 'number' ? global.cameraZoomAtual : (global.ZOOM_CAMERA || 0.92));
        const viewW = (global.canvas ? global.canvas.width : 800) / zoom;
        const viewH = (global.canvas ? global.canvas.height : 600) / zoom;

        const c0 = Math.max(0, Math.floor((camX - PANT_X0 - 80) / TILE));
        const c1 = Math.min(COLS - 1, Math.ceil((camX - PANT_X0 + viewW + 80) / TILE));
        const l0 = Math.max(0, Math.floor((camY - 80) / TILE));
        const l1 = Math.min(ROWS - 1, Math.ceil((camY + viewH + 80) / TILE));

        // 1. FUNDO CONTÍNUO NATURAL (SEM TILES / SEM QUADRADINHOS)
        ctx.fillStyle = '#101a0e';
        ctx.fillRect(PANT_X0 + c0 * TILE, l0 * TILE, (c1 - c0 + 1) * TILE, (l1 - l0 + 1) * TILE);

        // 2. CAMADA DE TERRENO ORGÂNICO (Trilhas, Lodo, Água e Passarelas)
        for (let l = l0; l <= l1; l++) {
            for (let c = c0; c <= c1; c++) {
                const x = PANT_X0 + c * TILE;
                const y = l * TILE;
                const cel = grid[l][c];
                const tl = cel.tipo;
                const h = hash2(c * 13, l * 29);

                if (tl === 'trilha_pantano') {
                    // Trilha de terra úmida pisoteada
                    ctx.fillStyle = '#1e2b19';
                    ctx.fillRect(x, y, TILE, TILE);
                    ctx.fillStyle = '#263820';
                    if (h > 0.5) ctx.fillRect(x + 4, y + 6, 12, 6);
                } else if (tl === 'passarela_madeira' || tl === 'ponte_pantano') {
                    // Passarela de tábuas rústicas de madeira
                    ctx.fillStyle = '#131b11';
                    ctx.fillRect(x, y, TILE, TILE);
                    // Pranchas
                    ctx.fillStyle = h > 0.5 ? '#3b2a1a' : '#332315';
                    ctx.fillRect(x + 2, y + 2, TILE - 4, 10);
                    ctx.fillRect(x + 2, y + 14, TILE - 4, 10);
                    ctx.fillRect(x + 2, y + 26, TILE - 4, 10);
                    // Pregos
                    ctx.fillStyle = '#1a1008';
                    ctx.fillRect(x + 4, y + 6, 2, 2);
                    ctx.fillRect(x + TILE - 6, y + 6, 2, 2);
                } else if (tl === 'agua_pantano') {
                    // Água escura do pântano com marolas suaves
                    ctx.fillStyle = '#0c1a11';
                    ctx.fillRect(x, y, TILE, TILE);

                    const wave = Math.sin(t * 1.5 + c * 0.35 + l * 0.25) * 2;
                    ctx.strokeStyle = 'rgba(40, 80, 55, 0.45)';
                    ctx.lineWidth = 1.2;
                    ctx.beginPath();
                    ctx.moveTo(x + 3, y + 15 + wave);
                    ctx.quadraticCurveTo(x + 20, y + 10 + wave, x + 37, y + 16 + wave);
                    ctx.stroke();

                    // Mancha sutil de lentilha d'água
                    if (h > 0.7) {
                        ctx.fillStyle = '#2a4d20';
                        ctx.beginPath();
                        ctx.arc(x + 12 + h * 8, y + 20 + wave, 3, 0, Math.PI * 2);
                        ctx.fill();
                    }
                } else if (tl === 'grama_pantano') {
                    // Musgo fofo e turfa verde
                    ctx.fillStyle = '#1a2e16';
                    ctx.fillRect(x, y, TILE, TILE);
                }
            }
        }

        // 3. NÉVOA BAIXA RASTEIRA TRANSLÚCIDA DO PÂNTANO
        desenharNevoaSuave(ctx, t, camX, camY, viewW, viewH);

        // 4. PORTAL RÚNICO DO PÂNTANO A OESTE
        if (!PORTAL_PANTANO_RETORNO) return;
        desenharPortalPantano(ctx, PORTAL_PANTANO_RETORNO.x, PORTAL_PANTANO_RETORNO.y, t);
    }

    // ============================================================================
    // NÉVOA BAIXA TRANSLÚCIDA DO PÂNTANO (SUAVE, SEM CÍRCULOS DUROS)
    // ============================================================================
    function desenharNevoaSuave(ctx, t, camX, camY, viewW, viewH) {
        ctx.save();
        const offX = (t * 22) % 600;

        for (let i = 0; i < 4; i++) {
            const yBruma = camY + (i * 220) % (viewH + 100);
            const gNev = ctx.createLinearGradient(0, yBruma - 35, 0, yBruma + 35);
            gNev.addColorStop(0, 'rgba(120, 160, 135, 0)');
            gNev.addColorStop(0.5, 'rgba(100, 145, 120, 0.08)');
            gNev.addColorStop(1, 'rgba(120, 160, 135, 0)');

            ctx.fillStyle = gNev;
            ctx.fillRect(camX - 50, yBruma - 35, viewW + 100, 70);
        }
        ctx.restore();
    }

    // ============================================================================
    // PORTAL ANCESTRAL DE CIPRESTE DO PÂNTANO
    // ============================================================================
    function desenharPortalPantano(ctx, x, y, t) {
        ctx.save();
        const pulso = 0.85 + Math.sin(t * 3.0) * 0.15;

        // Halo suave com gradiente radial (perfeito e sem círculos duros)
        const gHalo = ctx.createRadialGradient(x, y, 5, x, y, 75 * pulso);
        gHalo.addColorStop(0, 'rgba(46, 204, 113, 0.35)');
        gHalo.addColorStop(0.5, 'rgba(39, 174, 96, 0.15)');
        gHalo.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = gHalo;
        ctx.beginPath();
        ctx.arc(x, y, 75 * pulso, 0, Math.PI * 2);
        ctx.fill();

        // Pilares de pedra cobertos de hera
        ctx.fillStyle = '#1c2419';
        ctx.fillRect(x - 38, y - 45, 14, 55);
        ctx.fillRect(x + 24, y - 45, 14, 55);

        // Viga superior de madeira ancestral
        ctx.fillStyle = '#2b1c11';
        ctx.fillRect(x - 44, y - 55, 88, 14);

        // Fenda rúnica do portal
        ctx.fillStyle = 'rgba(46, 204, 113, ' + (0.7 + pulso * 0.25).toFixed(2) + ')';
        ctx.beginPath();
        ctx.ellipse(x, y - 10, 18 * pulso, 32 * pulso, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    // ============================================================================
    // Z-SORTING 2.5D: ÁRVORES, CABANAS, FOGUEIRA E DETALHES
    // ============================================================================
    function coletarPantanoSombrioSortables(tempoAnimacao, spritesSort) {
        if (!spritesSort) return;
        const t = (tempoAnimacao || 0);
        const camX = global.camX || 0;
        const camY = global.camY || 0;
        const zoom = (typeof global.cameraZoomAtual === 'number' ? global.cameraZoomAtual : (global.ZOOM_CAMERA || 0.92));
        const viewW = (global.canvas ? global.canvas.width : 800) / zoom;
        const viewH = (global.canvas ? global.canvas.height : 600) / zoom;

        // 1. Fogueira Comunal da Vila (com iluminação suave de gradiente radial)
        if (FOGUEIRA_COMUNAL.x >= camX - 100 && FOGUEIRA_COMUNAL.x <= camX + viewW + 100 &&
            FOGUEIRA_COMUNAL.y >= camY - 100 && FOGUEIRA_COMUNAL.y <= camY + viewH + 100) {
            spritesSort.push({
                tipo: 'fogueira_comunal_pantano',
                y: FOGUEIRA_COMUNAL.y + 6,
                draw: function () {
                    desenharFogueiraComunal(global.ctx, FOGUEIRA_COMUNAL, t);
                }
            });
        }

        // 2. Cabanas de Palafita da Vila
        for (let i = 0; i < VILA_CABANAS.length; i++) {
            const cab = VILA_CABANAS[i];
            if (cab.x + cab.w >= camX - 100 && cab.x - cab.w <= camX + viewW + 100 &&
                cab.y + cab.h >= camY - 100 && cab.y - cab.h <= camY + viewH + 100) {
                spritesSort.push({
                    tipo: 'cabana_pantano',
                    y: cab.y + cab.h / 2,
                    draw: function () {
                        desenharCabanaPalafita(global.ctx, cab, t);
                    }
                });
            }
        }

        // 3. Árvores e Elementos do Cenário visíveis na câmera
        if (!grid) gerarPantanoSombrio();
        const c0 = Math.max(0, Math.floor((camX - PANT_X0 - 100) / TILE));
        const c1 = Math.min(COLS - 1, Math.ceil((camX - PANT_X0 + viewW + 100) / TILE));
        const l0 = Math.max(0, Math.floor((camY - 100) / TILE));
        const l1 = Math.min(ROWS - 1, Math.ceil((camY + viewH + 100) / TILE));

        for (let l = l0; l <= l1; l++) {
            for (let c = c0; c <= c1; c++) {
                const cel = grid[l][c];
                const tl = cel.tipo;
                const x = PANT_X0 + c * TILE + TILE / 2;
                const y = l * TILE + TILE;

                if (tl === 'arvore_cipreste' || tl === 'muralha_cipreste_denso') {
                    spritesSort.push({
                        tipo: 'cipreste_pantano',
                        y: y,
                        draw: function () {
                            desenharCipreste(global.ctx, x, y, t);
                        }
                    });
                } else if (tl === 'salgueiro_chorao') {
                    spritesSort.push({
                        tipo: 'salgueiro_pantano',
                        y: y,
                        draw: function () {
                            desenharSalgueiro(global.ctx, x, y, t);
                        }
                    });
                } else if (tl === 'tronco_caido') {
                    spritesSort.push({
                        tipo: 'tronco_pantano',
                        y: y,
                        draw: function () {
                            desenharTroncoCaido(global.ctx, x, y);
                        }
                    });
                } else if (tl === 'cogumelo_lodo') {
                    spritesSort.push({
                        tipo: 'cogumelo_pantano',
                        y: y,
                        draw: function () {
                            desenharCogumeloLodo(global.ctx, x, y, t);
                        }
                    });
                }
            }
        }
    }

    // ============================================================================
    // DESENHOS DETALHADOS DE OBJETOS
    // ============================================================================

    // A. Fogueira Comunal com iluminação suave difusa
    function desenharFogueiraComunal(ctx, fog, t) {
        if (!ctx) return;
        ctx.save();
        const x = fog.x;
        const y = fog.y;

        // Brilho quente difuso e suave (sem círculo duro)
        const flicker = Math.sin(t * 12.0) * 5;
        const gLuz = ctx.createRadialGradient(x, y - 6, 4, x, y - 6, 85 + flicker);
        gLuz.addColorStop(0, 'rgba(255, 170, 40, 0.40)');
        gLuz.addColorStop(0.5, 'rgba(230, 90, 20, 0.15)');
        gLuz.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = gLuz;
        ctx.beginPath();
        ctx.arc(x, y - 6, 85 + flicker, 0, Math.PI * 2);
        ctx.fill();

        // Círculo de pedras
        ctx.fillStyle = '#22201d';
        for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2;
            ctx.beginPath();
            ctx.ellipse(x + Math.cos(a) * 18, y + Math.sin(a) * 11, 5, 3.5, a, 0, Math.PI * 2);
            ctx.fill();
        }

        // Brasas
        ctx.fillStyle = '#b32400';
        ctx.beginPath();
        ctx.ellipse(x, y, 12, 7, 0, 0, Math.PI * 2);
        ctx.fill();

        // Chamas
        const fl = Math.sin(t * 18.0) * 3;
        ctx.fillStyle = '#ff7700';
        ctx.beginPath();
        ctx.moveTo(x - 9, y + 2);
        ctx.quadraticCurveTo(x - 12 + fl, y - 14, x, y - 26);
        ctx.quadraticCurveTo(x + 12 - fl, y - 14, x + 9, y + 2);
        ctx.fill();

        ctx.fillStyle = '#ffea60';
        ctx.beginPath();
        ctx.moveTo(x - 5, y + 1);
        ctx.quadraticCurveTo(x - 6, y - 9, x, y - 17);
        ctx.quadraticCurveTo(x + 6, y - 9, x + 5, y + 1);
        ctx.fill();

        ctx.restore();
    }

    // B. Cabana de Palafita
    function desenharCabanaPalafita(ctx, cab, t) {
        if (!ctx) return;
        ctx.save();
        const x = cab.x;
        const y = cab.y;
        const w = cab.w;
        const h = cab.h;

        // Sombra suave sob a cabana
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.beginPath();
        ctx.ellipse(x, y + h * 0.45, w * 0.55, 18, 0, 0, Math.PI * 2);
        ctx.fill();

        // Estacas de madeira (palafitas)
        ctx.fillStyle = '#22150a';
        ctx.fillRect(x - w * 0.42, y + h * 0.15, 6, 24);
        ctx.fillRect(x - w * 0.15, y + h * 0.15, 6, 24);
        ctx.fillRect(x + w * 0.15, y + h * 0.15, 6, 24);
        ctx.fillRect(x + w * 0.42, y + h * 0.15, 6, 24);

        // Parede de tábuas de madeira escura
        ctx.fillStyle = '#302013';
        ctx.fillRect(x - w * 0.45, y - h * 0.45, w * 0.9, h * 0.65);

        // Porta
        ctx.fillStyle = '#1c1209';
        ctx.fillRect(x - 10, y - h * 0.20, 20, 32);

        // Janela iluminada com brilho acolhedor
        ctx.fillStyle = '#ffd166';
        ctx.fillRect(x + w * 0.22, y - h * 0.25, 14, 14);

        // Telhado de palha/tábuas inclinado
        ctx.fillStyle = '#26180c';
        ctx.beginPath();
        ctx.moveTo(x - w * 0.52, y - h * 0.42);
        ctx.lineTo(x, y - h * 0.82);
        ctx.lineTo(x + w * 0.52, y - h * 0.42);
        ctx.closePath();
        ctx.fill();

        // Chaminé com fumaça suave
        ctx.fillStyle = '#1e1c1a';
        ctx.fillRect(x - w * 0.28, y - h * 0.78, 8, 18);

        // Bolotas de fumaça
        const fumY = (t * 20) % 40;
        ctx.fillStyle = 'rgba(180, 190, 185, ' + (0.35 - fumY / 120).toFixed(2) + ')';
        ctx.beginPath();
        ctx.arc(x - w * 0.24 + Math.sin(t * 1.5) * 5, y - h * 0.82 - fumY, 6 + fumY * 0.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    // C. Cipreste-Calvo com raízes aéreas
    function desenharCipreste(ctx, x, y, t) {
        if (!ctx) return;
        ctx.save();

        // Sombra
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.ellipse(x, y - 2, 22, 9, 0, 0, Math.PI * 2);
        ctx.fill();

        // Joelhos de cipreste ao redor do tronco
        ctx.fillStyle = '#26170d';
        ctx.beginPath();
        ctx.moveTo(x - 24, y - 2); ctx.lineTo(x - 20, y - 16); ctx.lineTo(x - 16, y - 2);
        ctx.moveTo(x + 16, y - 2); ctx.lineTo(x + 20, y - 18); ctx.lineTo(x + 24, y - 2);
        ctx.fill();

        // Tronco bulboso
        ctx.fillStyle = '#21150c';
        ctx.beginPath();
        ctx.moveTo(x - 14, y - 2);
        ctx.quadraticCurveTo(x - 8, y - 45, x - 6, y - 85);
        ctx.lineTo(x + 6, y - 85);
        ctx.quadraticCurveTo(x + 8, y - 45, x + 14, y - 2);
        ctx.closePath();
        ctx.fill();

        // Copa alta
        const bal = Math.sin(t * 1.2 + x * 0.01) * 2;
        ctx.fillStyle = '#142611';
        ctx.beginPath();
        ctx.ellipse(x + bal, y - 105, 32, 26, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#1e381a';
        ctx.beginPath();
        ctx.ellipse(x + bal - 4, y - 118, 24, 20, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    // D. Salgueiro-Chorão com Barba-de-Velho
    function desenharSalgueiro(ctx, x, y, t) {
        if (!ctx) return;
        ctx.save();

        // Sombra
        ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
        ctx.beginPath();
        ctx.ellipse(x, y - 2, 24, 10, 0, 0, Math.PI * 2);
        ctx.fill();

        // Tronco curvo
        ctx.fillStyle = '#23180f';
        ctx.beginPath();
        ctx.moveTo(x - 10, y - 2);
        ctx.quadraticCurveTo(x - 4, y - 40, x - 5, y - 75);
        ctx.lineTo(x + 5, y - 75);
        ctx.quadraticCurveTo(x + 4, y - 40, x + 10, y - 2);
        ctx.closePath();
        ctx.fill();

        // Barba-de-velho pendente ondulando suavemente
        for (let i = -3; i <= 3; i++) {
            const bx = x + i * 9;
            const bal = Math.sin(t * 1.6 + i * 0.8) * 3.5;
            ctx.strokeStyle = 'rgba(85, 120, 80, 0.65)';
            ctx.lineWidth = 2.0;
            ctx.beginPath();
            ctx.moveTo(bx, y - 70);
            ctx.quadraticCurveTo(bx + bal * 0.6, y - 45, bx + bal, y - 25);
            ctx.stroke();
        }

        // Copa
        ctx.fillStyle = '#193315';
        ctx.beginPath();
        ctx.ellipse(x, y - 80, 34, 22, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    // E. Tronco Caído
    function desenharTroncoCaido(ctx, x, y) {
        if (!ctx) return;
        ctx.save();
        ctx.fillStyle = '#24180e';
        ctx.beginPath();
        ctx.ellipse(x, y - 6, 26, 7, 0.15, 0, Math.PI * 2);
        ctx.fill();
        // Oco escuro
        ctx.fillStyle = '#0f0a05';
        ctx.beginPath();
        ctx.ellipse(x - 22, y - 8, 4, 6, 0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // F. Cogumelo Bioluminescente
    function desenharCogumeloLodo(ctx, x, y, t) {
        if (!ctx) return;
        ctx.save();
        const pulso = 0.85 + Math.sin(t * 3.5 + x) * 0.15;
        // Brilho suave
        const g = ctx.createRadialGradient(x, y - 8, 2, x, y - 8, 22 * pulso);
        g.addColorStop(0, 'rgba(46, 204, 113, 0.45)');
        g.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y - 8, 22 * pulso, 0, Math.PI * 2);
        ctx.fill();

        // Chapéu
        ctx.fillStyle = '#2ecc71';
        ctx.beginPath();
        ctx.ellipse(x, y - 8, 7, 5, 0, Math.PI, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // ============================================================================
    // EXPORTAÇÃO ISOMÓRFICA
    // ============================================================================
    const api = {
        TILE: TILE,
        PANT_X0: PANT_X0,
        PANT_X1: PANT_X1,
        PANT_Y1: PANT_Y1,
        COLS: COLS,
        ROWS: ROWS,
        PANT_SPAWN: PANT_SPAWN,
        PONTO_CHEGADA: PONTO_CHEGADA,
        PORTAL_PANTANO_RETORNO: PORTAL_PANTANO_RETORNO,
        VILA_CABANAS: VILA_CABANAS,
        FOGUEIRA_COMUNAL: FOGUEIRA_COMUNAL,
        gerarPantanoSombrio: gerarPantanoSombrio,
        grid: function () { if (!grid) gerarPantanoSombrio(); return grid; },
        isPantanoSombrio: isPantanoSombrio,
        colidePantanoSombrio: colidePantanoSombrio,
        colideProjetilPantanoSombrio: colideProjetilPantanoSombrio,
        infoPortalPantanoSombrio: infoPortalPantanoSombrio,
        desenharCenarioPantanoSombrio: desenharCenarioPantanoSombrio,
        coletarPantanoSombrioSortables: coletarPantanoSombrioSortables,
        onUpdatePosicao: onUpdatePosicao
    };

    if (typeof window !== 'undefined') {
        gerarPantanoSombrio();
        pantanoChainAnterior = global.chainMapas;
        global.chainMapas = { onUpdatePosicao: onUpdatePosicao };
        global.LARGURA_PANTANO_SOMBRIO = PANT_X0;
        global.FIM_PANTANO_SOMBRIO = PANT_X1;
        global.ALTO_PANTANO_SOMBRIO = PANT_Y1;
        global.desenharCenarioPantanoSombrio = desenharCenarioPantanoSombrio;
        global.coletarPantanoSombrioSortables = coletarPantanoSombrioSortables;

        prevColide = global.colideMapaAtivo;
        global.colideMapaAtivo = function (x, y, raio) {
            if (global.currentMap === 'pantano_sombrio') return !isPantanoSombrio(x, y) || colidePantanoSombrio(x, y, raio);
            return typeof prevColide === 'function' ? prevColide(x, y, raio) : false;
        };

        prevColideP = global.colideProjetilMapaAtivo;
        global.colideProjetilMapaAtivo = function (x, y) {
            if (global.currentMap === 'pantano_sombrio') return !isPantanoSombrio(x, y) || colideProjetilPantanoSombrio(x, y);
            return typeof prevColideP === 'function' ? prevColideP(x, y) : false;
        };

        global.mapaPantanoSombrio = api;
    }

    if (typeof module !== 'undefined' && module.exports) {
        if (!grid) gerarPantanoSombrio();
        module.exports = api;
    }

})(typeof window !== 'undefined' ? window : globalThis);
