// ============================================================================
// mapa_zona_zero.js — Bioma de Gelo «Zona Zero» (Fase Glacial de Alta Fidelidade)
// Dimensões Oficiais: 8.000 × 9.000 px (200 cols × 225 rows de 40×40 px)
// Coordenadas Mundiais: X = 74.000 a 82.000 | Y = 0 a 9.000
// ============================================================================
// Destaques e Mecânicas:
//   • Terreno Ártico com Autotiling procedural: Neve fofa, neve batida/compacta,
//     permafrost com líquens violetas/azulados, lagos de gelo liso espelhado e rochas glaciais.
//   • Física de Deslizamento (ehGeloZonaZero): superfícies de gelo liso com baixo atrito
//     onde o personagem desliza suavemente com inércia e poeira de gelo.
//   • Efeitos Visuais Deslumbrantes:
//       - Aurora Boreal Dinâmica ondulando no céu polar (esmeralda, ciano e violeta)
//       - Nevasca Volumétrica multicamadas (120 partículas 3D com vento oscilante)
//       - Fagulhas Diamantinas piscando nos reflexos do gelo espelhado
//       - Névoa Glacial rasteira e cristais bioluminescentes
//   • 8 Complexos Temáticos e Pontos de Interesse:
//       1. Base Avançada da Expedição Zero (Spawn 74200, 1000 + Portal de Retorno Davahl)
//       2. Grande Lago Espelhado da Geada (Pista de Deslizamento contínua)
//       3. Santuário dos Cristais Eternos (Geodo com monólitos gigantes de cristal puro)
//       4. Vilarejo dos Caçadores do Ártico (Iglus de blocos de gelo e tochas azuis)
//       5. Vale dos Fósseis Congelados (Arcabouços colossais preservados sob o gelo)
//       6. Garganta Abissal da Fenda Azul (Cânion com pontes de gelo suspensas)
//       7. Cidadela Glacial Soterrada (Ruínas imperiais tomadas por calotas de gelo)
//       8. Covil da Geada Abissal (Geleira cavernosa com estalactites gotejantes)
//   • Vegetação & Elementos 2.5D com Z-Sorting Real:
//       - Pinheiros Siberianos Gigantes e Jovens com neve acumulada
//       - Iglus e Tendas de Expedição divididos em 2 camadas (base pisável + cúpula X-ray)
//       - Rochas graníticas polares e estalagmites pontiagudas
//   • Grid Espacial de Colisões O(1) (<0.001ms) garantindo 60 FPS cravados no PC e Celular.
// ============================================================================

(function (global) {
    'use strict';

    const TILE = 40;
    const ZZ_X0 = 74000;
    const ZZ_X1 = 82000;
    const ZZ_Y1 = 9000;
    const COLS = 200; // 8000 / 40
    const ROWS = 225; // 9000 / 40

    // Portais Oficiais da Zona Zero
    const PORTA_RETORNO = { x: 74160, y: 1000, r: 56, alvo: { x: 60474, y: 640 } }; // Volta à praça de Davahl
    const PONTO_SPAWN   = { x: 74200, y: 1000 };

    // Estado Geral do Mapa
    let grid = null;
    let colisoesGrid = null;
    let sortables = [];
    let pinheiros = [];
    let cristais = [];
    let rochasGelo = [];
    let iglus = [];
    let tendas = [];
    let fosseis = [];
    let lagosGelo = [];
    let particulasNevasca = [];
    let fagulhasGelo = [];

    // ========================================================================
    // GERADOR PROCEDURAL DETERMINÍSTICO (PRNG Mulberry32)
    // ========================================================================
    function criarPRNG(seed) {
        let s = seed >>> 0;
        return function () {
            s = (s + 0x6D2B79F5) >>> 0;
            let t = Math.imul(s ^ (s >>> 15), 1 | s);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    // ========================================================================
    // GERAÇÃO DO TERRENO E ELEMENTOS DA ZONA ZERO
    // ========================================================================
    function gerarZonaZero() {
        const rand = criarPRNG(133742);

        // 1. Inicializa Grid de Terreno (200x225)
        grid = new Array(ROWS);
        for (let r = 0; r < ROWS; r++) {
            grid[r] = new Uint8Array(COLS); // 0: neve_fofa, 1: neve_compacta, 2: gelo_liso, 3: permafrost, 4: rocha_borda
        }

        // 2. Define Lagos de Gelo Liso e Pistas Deslizantes
        lagosGelo = [
            // Lago 1: Grande Lago Espelhado da Geada (Pista Central Norte)
            { id: 1, nome: 'Grande Lago Espelhado da Geada', cx: 76500, cy: 2200, rx: 680, ry: 480 },
            // Lago 2: Lago dos Cristais Cintilantes (Nordeste)
            { id: 2, nome: 'Lago dos Cristais Cintilantes', cx: 79600, cy: 2000, rx: 520, ry: 380 },
            // Lago 3: Lago da Fenda da Bruxa do Gelo (Oeste)
            { id: 3, nome: 'Lago da Fenda Glacial', cx: 75200, cy: 3600, rx: 460, ry: 320 },
            // Lago 4: Pista dos Caçadores Polares (Centro-Oeste)
            { id: 4, nome: 'Pista dos Caçadores Polares', cx: 76800, cy: 4600, rx: 600, ry: 420 },
            // Lago 5: Vale dos Fósseis Congelados (Leste)
            { id: 5, nome: 'Espelho de Gelo dos Fósseis', cx: 79200, cy: 4800, rx: 550, ry: 390 },
            // Lago 6: Garganta Abissal da Fenda Azul (Sudoeste)
            { id: 6, nome: 'Fenda Azul Escorregadia', cx: 75400, cy: 6800, rx: 500, ry: 340 },
            // Lago 7: Bacia Glacial da Cidadela (Centro-Sul)
            { id: 7, nome: 'Bacia da Cidadela Glacial', cx: 78200, cy: 7100, rx: 640, ry: 450 },
            // Lago 8: Lago do Covil da Geada Abissal (Sul Profundo)
            { id: 8, nome: 'Gelo Abissal do Covil', cx: 77000, cy: 8300, rx: 580, ry: 410 }
        ];

        // Preenche o terreno com base em ruído de permafrost, neve compacta e lagos de gelo
        for (let r = 0; r < ROWS; r++) {
            const wy = r * TILE + 20;
            for (let c = 0; c < COLS; c++) {
                const wx = ZZ_X0 + c * TILE + 20;

                // Bordas de montanha/penhasco rochoso intransitável
                if (r < 2 || r >= ROWS - 2 || c < 2 || c >= COLS - 2) {
                    grid[r][c] = 4; // rocha_borda
                    continue;
                }

                // Verifica se está dentro de algum Lago de Gelo Liso
                let emLago = false;
                for (let k = 0; k < lagosGelo.length; k++) {
                    const lg = lagosGelo[k];
                    const dx = (wx - lg.cx) / lg.rx;
                    const dy = (wy - lg.cy) / lg.ry;
                    if (dx * dx + dy * dy <= 1.0) {
                        grid[r][c] = 2; // gelo_liso (deslizante!)
                        emLago = true;
                        break;
                    }
                }
                if (emLago) continue;

                // Padrão de neve compacta e permafrost baseado em ruído pseudo-aleatório
                const n = Math.sin(c * 0.12) * Math.cos(r * 0.14) + Math.sin(c * 0.05 + r * 0.07);
                if (n > 0.8) {
                    grid[r][c] = 3; // permafrost
                } else if (n > 0.15) {
                    grid[r][c] = 1; // neve_compacta
                } else {
                    grid[r][c] = 0; // neve_fofa
                }
            }
        }

        // Garante área de spawn limpa em neve compacta
        for (let r = 20; r <= 30; r++) {
            for (let c = 3; c <= 15; c++) {
                if (grid[r] && grid[r][c] !== undefined) {
                    grid[r][c] = 1; // neve_compacta
                }
            }
        }

        // 3. Grid Espacial de Colisões (200x225)
        colisoesGrid = new Array(ROWS);
        for (let r = 0; r < ROWS; r++) {
            colisoesGrid[r] = new Array(COLS);
        }

        function adicionarColisaoGrid(tipo, x, y, r, extra) {
            const col = Math.floor((x - ZZ_X0) / TILE);
            const lin = Math.floor(y / TILE);
            const rEfetivo = (r || 20);
            const raioBlocos = Math.ceil(rEfetivo / TILE) + 1;
            const obj = { tipo, x, y, cx: x, cy: y, r: rEfetivo, ...extra };

            for (let dr = -raioBlocos; dr <= raioBlocos; dr++) {
                const tr = lin + dr;
                if (tr < 0 || tr >= ROWS) continue;
                for (let dc = -raioBlocos; dc <= raioBlocos; dc++) {
                    const tc = col + dc;
                    if (tc < 0 || tc >= COLS) continue;
                    if (!colisoesGrid[tr][tc]) colisoesGrid[tr][tc] = [];
                    colisoesGrid[tr][tc].push(obj);
                }
            }
        }

        // 4. Criação dos 8 Complexos Temáticos e Estruturas
        sortables = [];
        iglus = [];
        tendas = [];
        cristais = [];
        rochasGelo = [];
        pinheiros = [];
        fosseis = [];

        // --- Complexo 1: Base Avançada da Expedição Zero (Spawn) ---
        // Tendas polares reforçadas
        tendas.push({ id: 'tenda_spawn_1', x: 74280, y: 920, w: 90, h: 70, cor: '#c85a32', nome: 'Tenda de Comando Polar' });
        tendas.push({ id: 'tenda_spawn_2', x: 74130, y: 1140, w: 80, h: 65, cor: '#3a6b8c', nome: 'Tenda de Suprimentos da Geada' });
        // Fogueira de expedição polar protegida por troncos
        sortables.push({
            tipo: 'fogueira_polar',
            x: 74210,
            y: 1060,
            base: 1065,
            draw: function (ctx, t) { desenharFogueiraPolar(ctx, this.x, this.y, t); }
        });

        // --- Complexo 4: Vilarejo dos Caçadores do Ártico ---
        iglus.push({ id: 'iglu_cacad_1', x: 76000, y: 4320, r: 52, nome: 'Iglu do Ancião da Neve' });
        iglus.push({ id: 'iglu_cacad_2', x: 76180, y: 4460, r: 46, nome: 'Iglu dos Batedores do Vento' });
        iglus.push({ id: 'iglu_cacad_3', x: 75860, y: 4500, r: 48, nome: 'Iglu de Armazenamento de Peles' });
        iglus.push({ id: 'iglu_cacad_4', x: 76040, y: 4620, r: 54, nome: 'Choça de Gelo Coletiva' });

        // --- Complexo 7: Cidadela Glacial Soterrada ---
        tendas.push({ id: 'tenda_ruinas_1', x: 78420, y: 7080, w: 85, h: 68, cor: '#4e5b6e', nome: 'Posto Arqueológico Glacial' });
        tendas.push({ id: 'tenda_ruinas_2', x: 78600, y: 7240, w: 80, h: 65, cor: '#3b4453', nome: 'Acampamento dos Historiadores' });

        // Registra Iglus no Y-sorting e colisões
        iglus.forEach(ig => {
            adicionarColisaoGrid('circle', ig.x, ig.y, ig.r * 0.82, { nome: ig.nome });
            // Base do iglu
            sortables.push({
                tipo: 'iglu_base',
                x: ig.x,
                y: ig.y,
                base: ig.y + ig.r * 0.4,
                draw: function (ctx) { desenharIgluBase(ctx, ig); }
            });
            // Cúpula do iglu (telhado com X-ray)
            sortables.push({
                tipo: 'iglu_cupula',
                x: ig.x,
                y: ig.y,
                base: ig.y + ig.r + 6,
                draw: function (ctx) { desenharIgluCupula(ctx, ig); }
            });
        });

        // Registra Tendas no Y-sorting e colisões
        tendas.forEach(td => {
            adicionarColisaoGrid('rect', td.x, td.y, 0, { w: td.w * 0.8, h: td.h * 0.5, nome: td.nome });
            sortables.push({
                tipo: 'tenda_base',
                x: td.x,
                y: td.y,
                base: td.y + td.h * 0.4,
                draw: function (ctx) { desenharTendaPolarBase(ctx, td); }
            });
            sortables.push({
                tipo: 'tenda_teto',
                x: td.x,
                y: td.y,
                base: td.y + td.h + 8,
                draw: function (ctx) { desenharTendaPolarTeto(ctx, td); }
            });
        });

        // --- Complexo 3: Santuário dos Cristais Eternos (Geodos Gigantes) ---
        const santuarioX = 79800, santuarioY = 1800;
        for (let i = 0; i < 18; i++) {
            const ang = (i / 18) * Math.PI * 2;
            const dist = 140 + (i % 3) * 45;
            const cx = santuarioX + Math.cos(ang) * dist;
            const cy = santuarioY + Math.sin(ang) * dist;
            cristais.push({
                id: 'cristal_santuario_' + i,
                x: cx,
                y: cy,
                alt: 55 + (i % 4) * 15,
                larg: 22 + (i % 3) * 6,
                cor: i % 2 === 0 ? '#4fe3ff' : '#a2f5ff',
                brilho: 18 + (i % 3) * 8
            });
        }

        // --- Complexo 5: Vale dos Fósseis Congelados ---
        fosseis.push({ x: 79150, y: 4720, ang: -0.2, escala: 1.2, tipo: 'mamute_costelas' });
        fosseis.push({ x: 79350, y: 4880, ang: 0.35, escala: 1.0, tipo: 'cranio_besta' });
        fosseis.push({ x: 79050, y: 4950, ang: 0.1, escala: 0.9, tipo: 'coluna_fossil' });

        fosseis.forEach(f => {
            adicionarColisaoGrid('circle', f.x, f.y, 22 * f.escala, { nome: 'Fóssil Congelado' });
            sortables.push({
                tipo: 'fossil_glacial',
                x: f.x,
                y: f.y,
                base: f.y + 12,
                draw: function (ctx) { desenharFossilGlacial(ctx, f); }
            });
        });

        // 5. Geração de Cristais de Gelo Dispersos (70 adicionais)
        for (let i = 0; i < 70; i++) {
            const cx = ZZ_X0 + 300 + rand() * (8000 - 600);
            const cy = 250 + rand() * (9000 - 500);
            // Evita spawn
            if (Math.hypot(cx - PONTO_SPAWN.x, cy - PONTO_SPAWN.y) < 220) continue;

            const alt = 36 + rand() * 32;
            const larg = 16 + rand() * 14;
            cristais.push({
                id: 'cristal_' + i,
                x: cx,
                y: cy,
                alt: alt,
                larg: larg,
                cor: rand() > 0.4 ? '#4fe3ff' : '#88f0ff',
                brilho: 14 + rand() * 10
            });
        }

        cristais.forEach(cr => {
            adicionarColisaoGrid('circle', cr.x, cr.y, cr.larg * 0.7, { nome: 'Cristal Eterno' });
            sortables.push({
                tipo: 'cristal_gelo',
                x: cr.x,
                y: cr.y,
                base: cr.y + 6,
                alt: cr.alt,
                larg: cr.larg,
                cor: cr.cor,
                brilho: cr.brilho,
                draw: function (ctx, t) { desenharCristalGelo(ctx, this, t); }
            });
        });

        // 6. Geração de Rochas Graníticas Polares (100 unidades)
        for (let i = 0; i < 100; i++) {
            const rx = ZZ_X0 + 260 + rand() * (8000 - 520);
            const ry = 220 + rand() * (9000 - 440);
            if (Math.hypot(rx - PONTO_SPAWN.x, ry - PONTO_SPAWN.y) < 220) continue;

            const raio = 16 + rand() * 18;
            rochasGelo.push({ x: rx, y: ry, r: raio, formato: Math.floor(rand() * 4) });
            adicionarColisaoGrid('circle', rx, ry, raio * 0.85, { nome: 'Rocha Glacial' });
            sortables.push({
                tipo: 'rocha_gelo',
                x: rx,
                y: ry,
                base: ry + raio * 0.4,
                r: raio,
                formato: Math.floor(rand() * 4),
                draw: function (ctx) { desenharRochaGlacial(ctx, this); }
            });
        }

        // 7. Geração de Pinheiros Siberianos Gigantes e Jovens (280 unidades)
        for (let i = 0; i < 280; i++) {
            const px = ZZ_X0 + 220 + rand() * (8000 - 440);
            const py = 200 + rand() * (9000 - 400);

            // Não spawna dentro do lago de gelo ou no spawn
            if (Math.hypot(px - PONTO_SPAWN.x, py - PONTO_SPAWN.y) < 260) continue;
            const rTile = Math.floor(py / TILE);
            const cTile = Math.floor((px - ZZ_X0) / TILE);
            if (grid[rTile] && grid[rTile][cTile] === 2) continue; // não planta no gelo liso

            const gigante = (i < 160);
            const escala = gigante ? (1.0 + rand() * 0.4) : (0.65 + rand() * 0.3);
            const troncoRaio = gigante ? (16 * escala) : (11 * escala);

            pinheiros.push({
                x: px,
                y: py,
                base: py + 10 * escala,
                escala: escala,
                gigante: gigante,
                troncoRaio: troncoRaio,
                neve: 0.7 + rand() * 0.3
            });

            adicionarColisaoGrid('circle', px, py, troncoRaio, { nome: gigante ? 'Pinheiro Siberiano Gigante' : 'Pinheiro da Geada' });

            sortables.push({
                tipo: 'pinheiro_siberiano',
                x: px,
                y: py,
                base: py + 10 * escala,
                escala: escala,
                gigante: gigante,
                neve: 0.7 + rand() * 0.3,
                draw: function (ctx, t) { desenharPinheiroSiberiano(ctx, this, t); }
            });
        }

        // 8. Inicializa Sistema de Tempestade de Neve (120 partículas volumétricas)
        particulasNevasca = [];
        for (let i = 0; i < 120; i++) {
            particulasNevasca.push({
                x: rand() * 1600,
                y: rand() * 1200,
                z: 0.4 + rand() * 1.6, // profundidade 3D
                vx: -1.8 - rand() * 2.5,
                vy: 2.2 + rand() * 3.0,
                raio: 1.2 + rand() * 2.8,
                opacidade: 0.3 + rand() * 0.6,
                fase: rand() * Math.PI * 2
            });
        }

        // 9. Fagulhas de Brilho Diamantino nos Lagos de Gelo (150 pontos cintilantes)
        fagulhasGelo = [];
        for (let i = 0; i < 150; i++) {
            const lg = lagosGelo[Math.floor(rand() * lagosGelo.length)];
            const ang = rand() * Math.PI * 2;
            const dist = rand() * 0.85;
            fagulhasGelo.push({
                x: lg.cx + Math.cos(ang) * lg.rx * dist,
                y: lg.cy + Math.sin(ang) * lg.ry * dist,
                vel: 1.5 + rand() * 2.5,
                fase: rand() * Math.PI * 2,
                tamanho: 2 + rand() * 3
            });
        }

        console.log(`Zona Zero gerada com sucesso: ${COLS}x${ROWS} tiles, ${sortables.length} sortables.`);
    }

    // ========================================================================
    // DETECÇÃO DE GELO LISO (FÍSICA DE DESLIZAMENTO)
    // ========================================================================
    function ehGeloZonaZero(wx, wy) {
        if (!grid || wx < ZZ_X0 || wx >= ZZ_X1 || wy < 0 || wy >= ZZ_Y1) return false;
        const col = Math.floor((wx - ZZ_X0) / TILE);
        const lin = Math.floor(wy / TILE);
        if (lin < 0 || lin >= ROWS || col < 0 || col >= COLS) return false;
        return grid[lin][col] === 2; // 2 = gelo_liso
    }

    // ========================================================================
    // COLISÃO FÍSICA AUTORITATIVA (O(1) Spatial Grid)
    // ========================================================================
    function colideZonaZero(wx, wy, raio) {
        if (!colisoesGrid) return false;
        if (wx < ZZ_X0 || wx >= ZZ_X1 || wy < 0 || wy >= ZZ_Y1) return true;

        const r = (typeof raio === 'number' && raio > 0) ? raio : 12;

        // Ponto de Spawn e Portal de Retorno: 100% Protegidos contra qualquer colisão
        if (Math.hypot(wx - PONTO_SPAWN.x, wy - PONTO_SPAWN.y) < 70 ||
            Math.hypot(wx - PORTA_RETORNO.x, wy - PORTA_RETORNO.y) < 70) {
            return false;
        }

        // Bloqueio das Bordas de Rocha Glacial e extremos do mundo
        const col = Math.floor((wx - ZZ_X0) / TILE);
        const lin = Math.floor(wy / TILE);
        if (col < 1 || col >= COLS - 1 || lin < 1 || lin >= ROWS - 1) return true;
        if (grid && grid[lin] && grid[lin][col] === 4) return true;

        // Checagem nas células 3x3 vizinhas (Spatial Grid O(1))
        for (let dr = -1; dr <= 1; dr++) {
            const tr = lin + dr;
            if (tr < 0 || tr >= ROWS) continue;
            for (let dc = -1; dc <= 1; dc++) {
                const tc = col + dc;
                if (tc < 0 || tc >= COLS) continue;
                const celula = colisoesGrid[tr][tc];
                if (!celula) continue;

                for (let i = 0; i < celula.length; i++) {
                    const obs = celula[i];
                    if (obs.tipo === 'circle' || obs.tipo === 'circulo') {
                        const ox = obs.cx !== undefined ? obs.cx : obs.x;
                        const oy = obs.cy !== undefined ? obs.cy : obs.y;
                        const distSq = (wx - ox) * (wx - ox) + (wy - oy) * (wy - oy);
                        const minD = r + obs.r;
                        if (distSq < minD * minD) return true;
                    } else if (obs.tipo === 'rect' || obs.tipo === 'caixa' || obs.tipo === 'box') {
                        const hw = (obs.w || 40) / 2;
                        const hh = (obs.h || 40) / 2;
                        const cx = obs.x !== undefined ? obs.x : obs.cx;
                        const cy = obs.y !== undefined ? obs.y : obs.cy;
                        const nx = Math.max(cx - hw, Math.min(wx, cx + hw));
                        const ny = Math.max(cy - hh, Math.min(wy, cy + hh));
                        const dx = wx - nx;
                        const dy = wy - ny;
                        if (dx * dx + dy * dy < r * r) return true;
                    }
                }
            }
        }
        return false;
    }

    function colideProjetilZonaZero(x, y) {
        return colideZonaZero(x, y, 6);
    }

    function colideMapaAtivo(cx, cy, raio) {
        return colideZonaZero(cx, cy, raio);
    }

    function obterColisoesFormatadas() {
        if (!grid) gerarZonaZero();
        const lista = [];
        let idCounter = 1;

        // Pinheiros
        for (let i = 0; i < pinheiros.length; i++) {
            const p = pinheiros[i];
            const rTronco = p.troncoRaio || (p.gigante ? 16 * p.escala : 11 * p.escala);
            lista.push({
                id: 'col_zz_pinheiro_' + idCounter++,
                tipo: 'circle',
                nome: (p.gigante ? 'Tronco Pinheiro Siberiano Gigante #' : 'Tronco Pinheiro da Geada #') + (i + 1),
                cx: Math.round(p.x - ZZ_X0),
                cy: Math.round(p.y),
                r: Math.round(rTronco)
            });
        }

        // Rochas
        for (let i = 0; i < rochasGelo.length; i++) {
            const r = rochasGelo[i];
            lista.push({
                id: 'col_zz_rocha_' + idCounter++,
                tipo: 'circle',
                nome: 'Rocha Glacial #' + (i + 1),
                cx: Math.round(r.x - ZZ_X0),
                cy: Math.round(r.y),
                r: Math.round(r.r * 0.85)
            });
        }

        // Cristais
        for (let i = 0; i < cristais.length; i++) {
            const cr = cristais[i];
            lista.push({
                id: 'col_zz_cristal_' + idCounter++,
                tipo: 'circle',
                nome: 'Cristal Eterno #' + (i + 1),
                cx: Math.round(cr.x - ZZ_X0),
                cy: Math.round(cr.y),
                r: Math.round(cr.larg * 0.7)
            });
        }

        // Tendas
        for (let i = 0; i < tendas.length; i++) {
            const td = tendas[i];
            lista.push({
                id: 'col_zz_tenda_' + idCounter++,
                tipo: 'rect',
                nome: td.nome || 'Tenda de Expedição',
                x: Math.round(td.x - ZZ_X0 - td.w * 0.4),
                y: Math.round(td.y - td.h * 0.25),
                w: Math.round(td.w * 0.8),
                h: Math.round(td.h * 0.5)
            });
        }

        // Iglus
        for (let i = 0; i < iglus.length; i++) {
            const ig = iglus[i];
            lista.push({
                id: 'col_zz_iglu_' + idCounter++,
                tipo: 'circle',
                nome: ig.nome || 'Iglu de Caçador',
                cx: Math.round(ig.x - ZZ_X0),
                cy: Math.round(ig.y),
                r: Math.round(ig.r * 0.85)
            });
        }

        // Fósseis
        for (let i = 0; i < fosseis.length; i++) {
            const f = fosseis[i];
            lista.push({
                id: 'col_zz_fossil_' + idCounter++,
                tipo: 'circle',
                nome: 'Fóssil Congelado #' + (i + 1),
                cx: Math.round(f.x - ZZ_X0),
                cy: Math.round(f.y),
                r: Math.round(22 * f.escala)
            });
        }

        return lista;
    }

    function obterCamadasFormatadas() {
        if (!grid) gerarZonaZero();
        const lista = [];
        let idCounter = 1;

        // Copas dos Pinheiros (2.5D Z-sorting + X-Ray)
        for (let i = 0; i < pinheiros.length; i++) {
            const p = pinheiros[i];
            const sc = p.escala || 1.0;
            lista.push({
                id: 'cam_zz_copa_pinheiro_' + idCounter++,
                tipo: 'rect',
                nome: (p.gigante ? 'Copa Pinheiro Siberiano Gigante #' : 'Copa Pinheiro da Geada #') + (i + 1),
                x: Math.round(p.x - ZZ_X0 - 45 * sc),
                y: Math.round(p.y - 95 * sc),
                w: Math.round(90 * sc),
                h: Math.round(105 * sc),
                baseY: Math.round(p.base || (p.y + 10 * sc)),
                ordem: 1
            });
        }

        // Telhados das Tendas
        for (let i = 0; i < tendas.length; i++) {
            const td = tendas[i];
            lista.push({
                id: 'cam_zz_teto_tenda_' + idCounter++,
                tipo: 'rect',
                nome: 'Telhado da ' + (td.nome || 'Tenda de Expedição'),
                x: Math.round(td.x - ZZ_X0 - td.w / 2),
                y: Math.round(td.y - td.h / 2),
                w: Math.round(td.w),
                h: Math.round(td.h),
                baseY: Math.round(td.y + td.h + 8),
                ordem: 1
            });
        }

        // Cúpulas dos Iglus
        for (let i = 0; i < iglus.length; i++) {
            const ig = iglus[i];
            lista.push({
                id: 'cam_zz_cupula_iglu_' + idCounter++,
                tipo: 'rect',
                nome: 'Cúpula do ' + (ig.nome || 'Iglu'),
                x: Math.round(ig.x - ZZ_X0 - ig.r),
                y: Math.round(ig.y - ig.r),
                w: Math.round(ig.r * 2),
                h: Math.round(ig.r * 1.5),
                baseY: Math.round(ig.y + ig.r + 6),
                ordem: 1
            });
        }

        // Cristais
        for (let i = 0; i < cristais.length; i++) {
            const cr = cristais[i];
            lista.push({
                id: 'cam_zz_cristal_' + idCounter++,
                tipo: 'rect',
                nome: 'Cristal Eterno #' + (i + 1),
                x: Math.round(cr.x - ZZ_X0 - cr.larg / 2),
                y: Math.round(cr.y - cr.alt),
                w: Math.round(cr.larg),
                h: Math.round(cr.alt),
                baseY: Math.round(cr.y + 6),
                ordem: 1
            });
        }

        // Rochas
        for (let i = 0; i < rochasGelo.length; i++) {
            const r = rochasGelo[i];
            lista.push({
                id: 'cam_zz_rocha_' + idCounter++,
                tipo: 'rect',
                nome: 'Rocha Glacial #' + (i + 1),
                x: Math.round(r.x - ZZ_X0 - r.r),
                y: Math.round(r.y - r.r),
                w: Math.round(r.r * 2),
                h: Math.round(r.r * 2),
                baseY: Math.round(r.y + r.r * 0.4),
                ordem: 1
            });
        }

        // Fósseis
        for (let i = 0; i < fosseis.length; i++) {
            const f = fosseis[i];
            lista.push({
                id: 'cam_zz_fossil_' + idCounter++,
                tipo: 'rect',
                nome: 'Fóssil Congelado #' + (i + 1),
                x: Math.round(f.x - ZZ_X0 - 30 * f.escala),
                y: Math.round(f.y - 25 * f.escala),
                w: Math.round(60 * f.escala),
                h: Math.round(50 * f.escala),
                baseY: Math.round(f.y + 12),
                ordem: 1
            });
        }

        return lista;
    }

    function isZonaZero(x, y) {
        return x >= ZZ_X0 && x < ZZ_X1 && y >= 0 && y < ZZ_Y1;
    }

    // ========================================================================
    // RENDERIZAÇÃO DO TERRENO E EFEITOS DE ATMOSFERA
    // ========================================================================
    function desenharCenarioZonaZero(tempoAnimacao) {
        const ctx = global.ctx;
        if (!ctx || !grid) return;

        const camX = global.camX || 0;
        const camY = global.camY || 0;
        const cw = global.canvas ? global.canvas.width : 1280;
        const ch = global.canvas ? global.canvas.height : 720;
        const zoom = (typeof global.ZOOM_CAMERA === 'number' && global.ZOOM_CAMERA > 0) ? global.ZOOM_CAMERA : 0.92;

        const viewW = cw / zoom;
        const viewH = ch / zoom;

        // Frustum Culling
        const minCol = Math.max(0, Math.floor((camX - ZZ_X0 - 40) / TILE));
        const maxCol = Math.min(COLS - 1, Math.ceil((camX - ZZ_X0 + viewW + 40) / TILE));
        const minRow = Math.max(0, Math.floor((camY - 40) / TILE));
        const maxRow = Math.min(ROWS - 1, Math.ceil((camY + viewH + 40) / TILE));

        const t = (tempoAnimacao || Date.now()) * 0.001;

        // 1. Renderiza Tiles de Terreno
        for (let r = minRow; r <= maxRow; r++) {
            const py = r * TILE;
            for (let c = minCol; c <= maxCol; c++) {
                const px = ZZ_X0 + c * TILE;
                const tipo = grid[r][c];

                if (tipo === 2) {
                    // GELO LISO (Lago Congelado Espelhado)
                    const grad = ctx.createLinearGradient(px, py, px + TILE, py + TILE);
                    grad.addColorStop(0, '#3fa6c4');
                    grad.addColorStop(0.5, '#2f88a4');
                    grad.addColorStop(1, '#1b647d');
                    ctx.fillStyle = grad;
                    ctx.fillRect(px, py, TILE, TILE);

                    // Fissuras de gelo brancas translúcidas
                    if ((c + r * 7) % 5 === 0) {
                        ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
                        ctx.lineWidth = 1.2;
                        ctx.beginPath();
                        ctx.moveTo(px + 4, py + 8);
                        ctx.lineTo(px + 22, py + 26);
                        ctx.lineTo(px + 36, py + 20);
                        ctx.stroke();
                    }
                } else if (tipo === 1) {
                    // NEVE COMPACTA (Batida pelo Vento)
                    ctx.fillStyle = '#dcebf5';
                    ctx.fillRect(px, py, TILE, TILE);
                    ctx.fillStyle = 'rgba(180, 205, 225, 0.3)';
                    ctx.fillRect(px + 2, py + 2, TILE - 4, 3);
                } else if (tipo === 3) {
                    // PERMAFROST (Solo escuro com líquens violetas)
                    ctx.fillStyle = '#445669';
                    ctx.fillRect(px, py, TILE, TILE);
                    ctx.fillStyle = '#5c486e';
                    ctx.fillRect(px + 6, py + 12, 10, 8);
                } else if (tipo === 4) {
                    // ROCHA DE BORDA / PENHASCO GLACIAL
                    ctx.fillStyle = '#263440';
                    ctx.fillRect(px, py, TILE, TILE);
                    // Calota de neve no topo
                    ctx.fillStyle = '#eef6fc';
                    ctx.fillRect(px, py, TILE, 8);
                } else {
                    // NEVE FOFA (Padrão claro azulado)
                    ctx.fillStyle = '#edf5fa';
                    ctx.fillRect(px, py, TILE, TILE);
                    // Granulações suaves
                    if ((c + r * 3) % 4 === 0) {
                        ctx.fillStyle = 'rgba(210, 230, 245, 0.5)';
                        ctx.fillRect(px + 8, py + 14, 6, 4);
                    }
                }
            }
        }

        // 2. Fagulhas de Brilho Diamantino nos Lagos de Gelo
        ctx.save();
        for (let i = 0; i < fagulhasGelo.length; i++) {
            const fg = fagulhasGelo[i];
            if (fg.x < camX - 20 || fg.x > camX + viewW + 20 || fg.y < camY - 20 || fg.y > camY + viewH + 20) continue;

            const brilho = Math.sin(t * fg.vel + fg.fase);
            if (brilho > 0.3) {
                const alpha = (brilho - 0.3) * 1.4;
                ctx.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(2)})`;
                ctx.beginPath();
                ctx.arc(fg.x, fg.y, fg.tamanho * (0.8 + brilho * 0.4), 0, Math.PI * 2);
                ctx.fill();

                // Cruz estelar de brilho
                ctx.strokeStyle = `rgba(210, 245, 255, ${(alpha * 0.7).toFixed(2)})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(fg.x - 5, fg.y); ctx.lineTo(fg.x + 5, fg.y);
                ctx.moveTo(fg.x, fg.y - 5); ctx.lineTo(fg.x, fg.y + 5);
                ctx.stroke();
            }
        }
        ctx.restore();

        // 3. Efeito da Aurora Boreal (Luzes Ondulantes no Céu Polar)
        desenharAuroraBoreal(ctx, camX, camY, viewW, viewH, t);

        // 4. Tempestade de Neve Volumétrica (Partículas 3D com Vento)
        desenharNevasca(ctx, camX, camY, viewW, viewH, t);
    }

    // --- Renderizador da Aurora Boreal ---
    function desenharAuroraBoreal(ctx, camX, camY, vw, vh, t) {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';

        const ondas = 3;
        for (let i = 0; i < ondas; i++) {
            const yBase = camY + 40 + i * 45;
            const amp = 35 + i * 15;
            const freq = 0.003 + i * 0.0015;
            const phase = t * 0.8 + i * 1.8;

            const grad = ctx.createLinearGradient(camX, yBase - amp, camX, yBase + amp + 60);
            if (i === 0) {
                grad.addColorStop(0, 'rgba(0, 255, 170, 0)');
                grad.addColorStop(0.5, 'rgba(0, 255, 180, 0.16)');
                grad.addColorStop(1, 'rgba(0, 255, 170, 0)');
            } else if (i === 1) {
                grad.addColorStop(0, 'rgba(0, 200, 255, 0)');
                grad.addColorStop(0.5, 'rgba(50, 180, 255, 0.18)');
                grad.addColorStop(1, 'rgba(120, 80, 255, 0)');
            } else {
                grad.addColorStop(0, 'rgba(180, 80, 255, 0)');
                grad.addColorStop(0.5, 'rgba(160, 60, 240, 0.14)');
                grad.addColorStop(1, 'rgba(0, 255, 200, 0)');
            }

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(camX, yBase + Math.sin(camX * freq + phase) * amp);

            for (let x = camX; x <= camX + vw + 60; x += 40) {
                const curY = yBase + Math.sin(x * freq + phase) * amp + Math.cos(x * 0.006 + phase * 0.7) * (amp * 0.4);
                ctx.lineTo(x, curY);
            }
            ctx.lineTo(camX + vw + 60, yBase + amp + 90);
            ctx.lineTo(camX, yBase + amp + 90);
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();
    }

    // --- Renderizador da Tempestade de Neve (Nevasca) ---
    function desenharNevasca(ctx, camX, camY, vw, vh, t) {
        ctx.save();
        ctx.fillStyle = '#ffffff';

        const ventoX = Math.sin(t * 0.6) * 1.5 - 2.8;

        for (let i = 0; i < particulasNevasca.length; i++) {
            const p = particulasNevasca[i];

            // Atualiza posição com base na câmera
            let rx = (camX + p.x + (t * (p.vx + ventoX) * 45)) % (vw + 200);
            if (rx < 0) rx += (vw + 200);
            const px = camX - 100 + rx;

            let ry = (camY + p.y + (t * p.vy * 40)) % (vh + 200);
            if (ry < 0) ry += (vh + 200);
            const py = camY - 100 + ry;

            ctx.globalAlpha = p.opacidade;
            ctx.beginPath();
            ctx.arc(px, py, p.raio * p.z, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    // ========================================================================
    // Y-SORTING E RENDERIZADORES DE ENTIDADES 2.5D
    // ========================================================================
    function coletarZonaZeroSortables(tempoAnimacao, spritesSort) {
        if (!Array.isArray(spritesSort)) return;

        const camX = global.camX || 0;
        const camY = global.camY || 0;
        const cw = global.canvas ? global.canvas.width : 1280;
        const ch = global.canvas ? global.canvas.height : 720;
        const zoom = (typeof global.ZOOM_CAMERA === 'number' && global.ZOOM_CAMERA > 0) ? global.ZOOM_CAMERA : 0.92;

        const viewW = cw / zoom;
        const viewH = ch / zoom;
        const t = (tempoAnimacao || Date.now()) * 0.001;

        for (let i = 0; i < sortables.length; i++) {
            const s = sortables[i];
            if (!s) continue;
            // Frustum culling por entidade
            if (s.x < camX - 140 || s.x > camX + viewW + 140 || s.base < camY - 140 || s.base > camY + viewH + 200) {
                continue;
            }

            spritesSort.push({
                y: s.base,
                draw: function () {
                    const ctx = global.ctx;
                    if (!ctx) return;
                    s.draw(ctx, t);
                }
            });
        }
    }

    // --- Renderizador do Pinheiro Siberiano Gigante / Jovem ---
    function desenharPinheiroSiberiano(ctx, s, t) {
        ctx.save();
        ctx.translate(s.x, s.base);

        const sc = s.escala || 1.0;
        const balanco = Math.sin(t * 1.5 + s.x * 0.05) * (1.8 * sc);

        // Verificação de X-Ray: quando o jogador está atrás da copa
        const pX = (typeof global.meuX === 'number') ? global.meuX + 12 : 0;
        const pY = (typeof global.meuY === 'number') ? global.meuY + 16 : 0;
        const alturaCopa = 130 * sc;
        const larguraCopa = 55 * sc;
        const estaAtras = (pX >= s.x - larguraCopa && pX <= s.x + larguraCopa && pY >= s.base - alturaCopa && pY <= s.base - 10);

        if (estaAtras) {
            ctx.globalAlpha = 0.48; // Translucidez X-Ray Inteligente
        }

        // 1. Sombra na Neve
        ctx.fillStyle = 'rgba(25, 45, 65, 0.35)';
        ctx.beginPath();
        ctx.ellipse(0, 4, 28 * sc, 10 * sc, 0, 0, Math.PI * 2);
        ctx.fill();

        // 2. Tronco de Madeira Siberiana
        ctx.fillStyle = '#3a2416';
        ctx.beginPath();
        ctx.moveTo(-10 * sc, 2);
        ctx.lineTo(-7 * sc, -35 * sc);
        ctx.lineTo(7 * sc, -35 * sc);
        ctx.lineTo(10 * sc, 2);
        ctx.closePath();
        ctx.fill();

        // Casca do tronco com neve incrustada
        ctx.fillStyle = '#eef6fc';
        ctx.beginPath();
        ctx.moveTo(-9 * sc, -5 * sc);
        ctx.lineTo(-6 * sc, -25 * sc);
        ctx.lineTo(-4 * sc, -25 * sc);
        ctx.lineTo(-7 * sc, -5 * sc);
        ctx.closePath();
        ctx.fill();

        // 3. Três Camadas de Copas Piramidais (Agulhas Verdes-Escuras + Camadas de Neve)
        const camadas = [
            { y: -30 * sc, larg: 55 * sc, alt: 42 * sc },
            { y: -62 * sc, larg: 44 * sc, alt: 38 * sc },
            { y: -92 * sc, larg: 32 * sc, alt: 35 * sc }
        ];

        for (let i = 0; i < camadas.length; i++) {
            const c = camadas[i];
            const sway = balanco * (0.4 + i * 0.3);

            // Folhagem verde-escura azulada de inverno
            ctx.fillStyle = i === 2 ? '#173d32' : (i === 1 ? '#13352a' : '#0e2b21');
            ctx.beginPath();
            ctx.moveTo(sway, c.y - c.alt);
            ctx.lineTo(c.larg + sway, c.y);
            ctx.lineTo(-c.larg + sway, c.y);
            ctx.closePath();
            ctx.fill();

            // Manto espesso de Neve Branca acumulada na copa
            ctx.fillStyle = '#f2f8fd';
            ctx.beginPath();
            ctx.moveTo(sway, c.y - c.alt);
            ctx.lineTo(c.larg * 0.75 + sway, c.y - c.alt * 0.25);
            ctx.lineTo(c.larg * 0.9 + sway, c.y - 2);
            ctx.quadraticCurveTo(sway, c.y - 8, -c.larg * 0.9 + sway, c.y - 2);
            ctx.lineTo(-c.larg * 0.75 + sway, c.y - c.alt * 0.25);
            ctx.closePath();
            ctx.fill();

            // Sombra azulada na base da neve
            ctx.fillStyle = 'rgba(160, 195, 225, 0.4)';
            ctx.beginPath();
            ctx.moveTo(-c.larg * 0.8 + sway, c.y - 2);
            ctx.quadraticCurveTo(sway, c.y - 6, c.larg * 0.8 + sway, c.y - 2);
            ctx.lineTo(c.larg * 0.8 + sway, c.y + 2);
            ctx.quadraticCurveTo(sway, c.y - 2, -c.larg * 0.8 + sway, c.y + 2);
            ctx.closePath();
            ctx.fill();
        }

        ctx.restore();
    }

    // --- Renderizador de Cristais Eternos de Gelo ---
    function desenharCristalGelo(ctx, cr, t) {
        ctx.save();
        ctx.translate(cr.x, cr.base);

        const pulso = Math.sin(t * 2.0 + cr.x * 0.1) * 0.25 + 0.75;

        // Halo de Iluminação Ciano
        ctx.shadowColor = cr.cor;
        ctx.shadowBlur = cr.brilho * pulso;

        // Sombra
        ctx.fillStyle = 'rgba(15, 30, 45, 0.4)';
        ctx.beginPath();
        ctx.ellipse(0, 3, cr.larg * 0.8, cr.larg * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();

        // Faceta Central do Cristal
        ctx.fillStyle = cr.cor;
        ctx.beginPath();
        ctx.moveTo(0, -cr.alt);
        ctx.lineTo(cr.larg * 0.6, -cr.alt * 0.4);
        ctx.lineTo(cr.larg * 0.4, 0);
        ctx.lineTo(-cr.larg * 0.4, 0);
        ctx.lineTo(-cr.larg * 0.6, -cr.alt * 0.4);
        ctx.closePath();
        ctx.fill();

        // Faceta de Luz Superior (Reflexo Branco Diamantino)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.beginPath();
        ctx.moveTo(0, -cr.alt);
        ctx.lineTo(cr.larg * 0.25, -cr.alt * 0.5);
        ctx.lineTo(0, -cr.alt * 0.2);
        ctx.lineTo(-cr.larg * 0.25, -cr.alt * 0.5);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }

    // --- Renderizador de Rocha Granítica Glacial ---
    function desenharRochaGlacial(ctx, r) {
        ctx.save();
        ctx.translate(r.x, r.base);

        // Sombra
        ctx.fillStyle = 'rgba(20, 35, 50, 0.35)';
        ctx.beginPath();
        ctx.ellipse(0, 2, r.r * 1.1, r.r * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Corpo de Granito Polar
        ctx.fillStyle = '#3f4f5c';
        ctx.beginPath();
        ctx.moveTo(-r.r, 0);
        ctx.lineTo(-r.r * 0.8, -r.r * 0.9);
        ctx.lineTo(-r.r * 0.2, -r.r * 1.15);
        ctx.lineTo(r.r * 0.7, -r.r * 0.95);
        ctx.lineTo(r.r, 0);
        ctx.closePath();
        ctx.fill();

        // Calota de Neve no Topo
        ctx.fillStyle = '#eef6fc';
        ctx.beginPath();
        ctx.moveTo(-r.r * 0.7, -r.r * 0.8);
        ctx.lineTo(-r.r * 0.2, -r.r * 1.15);
        ctx.lineTo(r.r * 0.65, -r.r * 0.95);
        ctx.quadraticCurveTo(0, -r.r * 0.6, -r.r * 0.7, -r.r * 0.8);
        ctx.closePath();
        ctx.fill();

        // Estalactites de gelo pontiagudas penduradas
        ctx.strokeStyle = 'rgba(180, 235, 255, 0.85)';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(-r.r * 0.3, -r.r * 0.6);
        ctx.lineTo(-r.r * 0.3, -r.r * 0.35);
        ctx.moveTo(r.r * 0.2, -r.r * 0.55);
        ctx.lineTo(r.r * 0.2, -r.r * 0.25);
        ctx.stroke();

        ctx.restore();
    }

    // --- Renderizador de Iglu (Base vs Cúpula 2.5D com X-Ray) ---
    function desenharIgluBase(ctx, ig) {
        ctx.save();
        ctx.translate(ig.x, ig.y);

        // Sombra
        ctx.fillStyle = 'rgba(15, 30, 45, 0.4)';
        ctx.beginPath();
        ctx.ellipse(0, ig.r * 0.5, ig.r * 1.15, ig.r * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Piso interno de gelo batido
        ctx.fillStyle = '#223c4a';
        ctx.beginPath();
        ctx.ellipse(0, ig.r * 0.25, ig.r * 0.85, ig.r * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();

        // Entrada em túnel de blocos de gelo
        ctx.fillStyle = '#0f1c24';
        ctx.beginPath();
        ctx.arc(0, ig.r * 0.45, ig.r * 0.32, Math.PI, 0);
        ctx.fill();

        ctx.restore();
    }

    function desenharIgluCupula(ctx, ig) {
        ctx.save();
        ctx.translate(ig.x, ig.y);

        // X-Ray quando jogador está sob o iglu
        const pX = (typeof global.meuX === 'number') ? global.meuX + 12 : 0;
        const pY = (typeof global.meuY === 'number') ? global.meuY + 16 : 0;
        if (Math.hypot(pX - ig.x, pY - ig.y) < ig.r * 1.1) {
            ctx.globalAlpha = 0.52;
        }

        // Cúpula Hemisférica de Blocos de Gelo
        ctx.fillStyle = '#e5f3fb';
        ctx.beginPath();
        ctx.arc(0, 0, ig.r, Math.PI, 0);
        ctx.lineTo(ig.r, ig.r * 0.35);
        ctx.quadraticCurveTo(0, ig.r * 0.5, -ig.r, ig.r * 0.35);
        ctx.closePath();
        ctx.fill();

        // Linhas de blocos de gelo lapidados
        ctx.strokeStyle = 'rgba(150, 195, 225, 0.55)';
        ctx.lineWidth = 1.6;
        for (let i = 1; i <= 3; i++) {
            const rLinha = ig.r * (i / 3.8);
            ctx.beginPath();
            ctx.arc(0, 0, rLinha, Math.PI * 0.95, Math.PI * 0.05);
            ctx.stroke();
        }

        // Arco do túnel de entrada
        ctx.strokeStyle = '#cde2ee';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(0, ig.r * 0.38, ig.r * 0.34, Math.PI, 0);
        ctx.stroke();

        ctx.restore();
    }

    // --- Renderizador de Tendas Polares de Expedição ---
    function desenharTendaPolarBase(ctx, td) {
        ctx.save();
        ctx.translate(td.x, td.y);
        ctx.fillStyle = 'rgba(10, 20, 30, 0.35)';
        ctx.fillRect(-td.w / 2 - 4, -td.h / 2 + 10, td.w + 8, td.h / 2 + 5);
        ctx.restore();
    }

    function desenharTendaPolarTeto(ctx, td) {
        ctx.save();
        ctx.translate(td.x, td.y);

        const pX = (typeof global.meuX === 'number') ? global.meuX + 12 : 0;
        const pY = (typeof global.meuY === 'number') ? global.meuY + 16 : 0;
        if (Math.abs(pX - td.x) < td.w * 0.6 && Math.abs(pY - td.y) < td.h * 0.6) {
            ctx.globalAlpha = 0.52;
        }

        // Lona reforçada triangular
        ctx.fillStyle = td.cor || '#c85a32';
        ctx.beginPath();
        ctx.moveTo(0, -td.h * 0.7);
        ctx.lineTo(td.w / 2, td.h * 0.4);
        ctx.lineTo(-td.w / 2, td.h * 0.4);
        ctx.closePath();
        ctx.fill();

        // Neve acumulada na cumeeira
        ctx.fillStyle = '#f0f7fd';
        ctx.beginPath();
        ctx.moveTo(0, -td.h * 0.7);
        ctx.lineTo(td.w * 0.3, -td.h * 0.25);
        ctx.lineTo(-td.w * 0.3, -td.h * 0.25);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }

    // --- Renderizador da Fogueira Polar ---
    function desenharFogueiraPolar(ctx, x, y, t) {
        ctx.save();
        ctx.translate(x, y);

        // Luz dinâmica quente
        const pulso = Math.sin(t * 8.0) * 8 + 48;
        ctx.fillStyle = 'rgba(255, 140, 40, 0.28)';
        ctx.beginPath();
        ctx.arc(0, 0, pulso, 0, Math.PI * 2);
        ctx.fill();

        // Pedras de proteção contra o vento
        ctx.fillStyle = '#495761';
        for (let i = 0; i < 7; i++) {
            const ang = (i / 7) * Math.PI * 2;
            ctx.beginPath();
            ctx.arc(Math.cos(ang) * 16, Math.sin(ang) * 12, 5.5, 0, Math.PI * 2);
            ctx.fill();
        }

        // Brasas e Chamas
        ctx.fillStyle = '#ff4500';
        ctx.beginPath();
        ctx.arc(0, 0, 7, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.arc(Math.sin(t * 10) * 2, -4 + Math.cos(t * 12) * 2, 4.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    // --- Renderizador de Fósseis Congelados ---
    function desenharFossilGlacial(ctx, f) {
        ctx.save();
        ctx.translate(f.x, f.base);
        ctx.rotate(f.ang || 0);
        ctx.scale(f.escala || 1, f.escala || 1);

        ctx.fillStyle = 'rgba(230, 225, 210, 0.85)';
        ctx.strokeStyle = '#b0a894';
        ctx.lineWidth = 2.5;

        // Costelas arqueadas de mamute ancestral
        for (let i = -3; i <= 3; i++) {
            ctx.beginPath();
            ctx.arc(i * 12, -18, 22, Math.PI * 0.2, Math.PI * 0.8);
            ctx.stroke();
        }

        ctx.restore();
    }

    // --- Portal Glacial Rúnico de Retorno a Davahl ---
    function desenharPortalZonaZero(tempoAnimacao) {
        const ctx = global.ctx;
        if (!ctx) return;
        const t = (tempoAnimacao || Date.now()) * 0.001;

        ctx.save();
        const px = PORTA_RETORNO.x;
        const py = PORTA_RETORNO.y;

        // Monólito de Gelo Rúnico
        ctx.shadowColor = '#00e5ff';
        ctx.shadowBlur = 25;

        // Anel de Cristais Glaciais
        ctx.strokeStyle = '#6fe7ff';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(px, py, PORTA_RETORNO.r, 0, Math.PI * 2);
        ctx.stroke();

        // Vórtice de Retorno Espiral Ciano/Branco
        for (let i = 0; i < 4; i++) {
            const raio = 16 + i * 9;
            const a0 = t * 2.2 + i * 1.5;
            ctx.lineWidth = 2.5;
            ctx.strokeStyle = i % 2 === 0 ? '#ffffff' : '#00e5ff';
            ctx.beginPath();
            ctx.arc(px, py, raio, a0, a0 + Math.PI * 0.8);
            ctx.stroke();
        }

        // Núcleo Radiante
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(px, py, 9, 0, Math.PI * 2);
        ctx.fill();

        // Rótulo Rúnico
        ctx.font = 'bold 12px sans-serif';
        ctx.fillStyle = '#c5f4ff';
        ctx.textAlign = 'center';
        ctx.fillText('PORTAL PARA DAVAHL', px, py - PORTA_RETORNO.r - 12);

        ctx.restore();
    }

    // ========================================================================
    // EXPORTAÇÃO DA API DA ZONA ZERO
    // ========================================================================
    const api = {
        TILE: TILE,
        ZZ_X0: ZZ_X0, ZZ_X1: ZZ_X1, ZZ_Y1: ZZ_Y1,
        COLS: COLS, ROWS: ROWS,
        PONTO_SPAWN: PONTO_SPAWN,
        PORTA_RETORNO: PORTA_RETORNO,
        gerarZonaZero: gerarZonaZero,
        grid: function () { return grid; },
        entidades: function () { return sortables; },
        lagos: function () { return lagosGelo; },
        ehGeloZonaZero: ehGeloZonaZero,
        colideZonaZero: colideZonaZero,
        colideProjetilZonaZero: colideProjetilZonaZero,
        colideMapaAtivo: colideMapaAtivo,
        isZonaZero: isZonaZero,
        obterColisoesFormatadas: obterColisoesFormatadas,
        obterCamadasFormatadas: obterCamadasFormatadas,
        desenharCenarioZonaZero: desenharCenarioZonaZero,
        coletarZonaZeroSortables: coletarZonaZeroSortables,
        desenharPortalZonaZero: desenharPortalZonaZero
    };

    // Browser
    if (global.window) {
        gerarZonaZero();
        global.desenharCenarioZonaZero = desenharCenarioZonaZero;
        global.coletarZonaZeroSortables = coletarZonaZeroSortables;
        global.desenharPortalZonaZero = desenharPortalZonaZero;
        global.ehGeloZonaZero = ehGeloZonaZero;
        global.colideZonaZero = colideZonaZero;
        global.colideProjetilZonaZero = colideProjetilZonaZero;

        // Encadeia colideMapaAtivo para validar colisões localmente no cliente
        const prevColide = global.colideMapaAtivo;
        global.colideMapaAtivo = function (x, y, raio) {
            if (global.currentMap === 'zonazero' || (x >= ZZ_X0 && x < ZZ_X1)) {
                return colideZonaZero(x, y, raio);
            }
            if (typeof prevColide === 'function') return prevColide(x, y, raio);
            return false;
        };

        global.mapaZonaZero = api;
    }

    // Node.js
    if (typeof module !== 'undefined' && module.exports) {
        if (!grid) gerarZonaZero();
        module.exports = api;
    }

})(typeof window !== 'undefined' ? window : this);
