// ============================================================================
// mapa_pantano.js — FASE 3: "Pântano das Almas" (Bioma de Pântano Realista)
// Módulo isomórfico: roda no NAVEGADOR (expõe funções em window) E no SERVIDOR
// (module.exports), então o mesmo grid de colisão vale para os dois lados.
//
//   • Fase 2 (deserto)     : x em [18000, 50000) × y em [0, 36000).
//   • Fase 3 (pântano)     : x em [50000, 58000) × y em [0, 9000).
//   • Tile = 40px → COLS=200, ROWS=225 (8.000 × 9.000 px).
//   • Alturas: 0=livre, 1=pequena, 2=média, 3=alta (bloqueia tudo).
//   • Água venenosa ('veneno'): livre p/ jogador (sofre dano de veneno sem passarela),
//     bloqueia monstros via ehVenenoPantano.
//   • Passarelas de madeira ('boardwalk'): seguras sobre o lodo e a água tóxica.
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
        lodo: ALT_LIVRE,
        turfa: ALT_LIVRE,
        lama_movedica: ALT_LIVRE,
        boardwalk: ALT_LIVRE,
        veneno: ALT_LIVRE,  // água venenosa: livre p/ jogador com debuff, monstros bloqueados
        rocha: ALT_PEQUENA,
        arvore: ALT_MEDIA,
        cabana: ALT_MEDIA,
        ruina: ALT_MEDIA,
        parede: ALT_MEDIA,
        mont: ALT_ALTA
    };

    // Faixa aberta no desfiladeiro oeste (mesma do mapa_deserto): linhas 200..215 em y
    const GATE_L0 = 200;
    const GATE_L1 = 215;
    const ALVO_RETORNO_DESERTO = { x: 49960, y: 8300 };
    const ALVO_RETORNO_CIDADE = { x: 60487, y: 660 };

    // Portais visuais
    const PORTA_ENTRADA = { x: PAN_X0 + 80, y: 8300, r: 58, alvo: ALVO_RETORNO_DESERTO };
    const PORTA_RETORNO = { x: PAN_X0 + 2000, y: 4500, r: 58, alvo: ALVO_RETORNO_CIDADE }; // x: 52000, y: 4500

    let grid = null;
    let colisoesGrid = null;
    let sortables = [];
    let decor = [];
    let lagosInfo = [];
    let cabanasInfo = [];
    let bolhasMetano = [];
    let vagalumes = [];

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

    function marcar(c, l, tipo) {
        if (l >= 0 && l < ROWS && c >= 0 && c < COLS) {
            grid[l][c] = { tipo: tipo, alt: TIPOS_ALT[tipo] !== undefined ? TIPOS_ALT[tipo] : ALT_LIVRE };
        }
    }

    // ---------- Geração Completa do Bioma de Pântano ----------
    function gerarPantano() {
        if (grid) return grid;

        grid = [];
        for (let l = 0; l < ROWS; l++) {
            grid[l] = [];
            for (let c = 0; c < COLS; c++) {
                grid[l][c] = { tipo: 'lodo', alt: ALT_LIVRE };
            }
        }

        const rnd = mulberry32(20260925);

        // 1) Montanhas altas nas fronteiras (leste = fim do mapa; oeste = barreira natural exceto desfiladeiro)
        for (let l = 0; l < ROWS; l++) {
            for (let c = 0; c < COLS; c++) {
                let montanha = false;
                if (c >= COLS - 2) montanha = true;                          // borda leste
                if (c <= 1 && (l < GATE_L0 || l > GATE_L1)) montanha = true; // borda oeste
                if (montanha) marcar(c, l, 'mont');
            }
        }

        // 2) Bolsões de Turfa Vegetal e Lama Movediça pelo mapa
        for (let l = 1; l < ROWS - 1; l++) {
            for (let c = 2; c < COLS - 2; c++) {
                if (grid[l][c].tipo === 'mont') continue;
                const h = hash2(c * 19, l * 31);
                if (h > 0.68) marcar(c, l, 'turfa');
                else if (h < 0.08) marcar(c, l, 'lama_movedica');
            }
        }

        // 3) Sistemas de Lagos e Lagoas de Água Venenosa com Lentilhas-d'água e Vitórias-Régias
        lagosInfo = [
            // Local 1: Posto das Brumas do Norte (Spawn de Teleporte x: 50200, y: 1000 -> c: 5, l: 25)
            { cx: 14, cy: 28, rx: 11, ry: 9, nome: 'Lagoa das Brumas' },
            // Local 2: Vilarejo Palafita Submerso (Aldeia Fantasma x: 52600, y: 2400 -> c: 65, l: 60)
            { cx: 65, cy: 60, rx: 16, ry: 13, nome: 'Brejo da Aldeia Fantasma' },
            // Local 3: Refúgio da Bruxa do Pântano / Santuário do Eremita (x: 55800, y: 1900 -> c: 145, l: 48)
            { cx: 145, cy: 48, rx: 14, ry: 10, nome: 'Poço da Bruxa' },
            // Local 4: Atracadouro do Pescador Perdido (Portal Davahl x: 52000, y: 4500 -> c: 50, l: 112)
            { cx: 50, cy: 112, rx: 14, ry: 12, nome: 'Lagoa do Pescador' },
            // Local 5: Feitoria Abandonada do Brejo Central (x: 54800, y: 4600 -> c: 120, l: 115)
            { cx: 120, cy: 115, rx: 15, ry: 12, nome: 'Brejo Central' },
            // Local 6: Cemitério de Barcos das Águas Negras (x: 56400, y: 6400 -> c: 160, l: 160)
            { cx: 160, cy: 160, rx: 15, ry: 12, nome: 'Águas Negras' },
            // Local 7: Posto Avançado da Garganta Ocidental (x: 50500, y: 8200 -> c: 12, l: 205)
            { cx: 16, cy: 205, rx: 11, ry: 9, nome: 'Charco da Garganta' },
            // Local 8: Acampamento dos Coletores de Turfa do Sul (x: 53600, y: 7800 -> c: 90, l: 195)
            { cx: 90, cy: 195, rx: 15, ry: 12, nome: 'Grande Lagoa do Sul' },
            // Lagos Naturais Adicionais para diversificação geográfica
            { cx: 32, cy: 152, rx: 12, ry: 9, nome: 'Charco dos Juncos' },
            { cx: 106, cy: 36, rx: 11, ry: 8, nome: 'Poça das Sombras' },
            { cx: 172, cy: 28, rx: 10, ry: 7, nome: 'Remanso Leste' },
            { cx: 176, cy: 108, rx: 12, ry: 9, nome: 'Brejo Solitário' }
        ];

        for (let k = 0; k < lagosInfo.length; k++) {
            const L = lagosInfo[k];
            for (let l = Math.max(0, Math.floor(L.cy - L.ry - 2)); l <= Math.min(ROWS - 1, Math.ceil(L.cy + L.ry + 2)); l++) {
                for (let c = Math.max(2, Math.floor(L.cx - L.rx - 2)); c <= Math.min(COLS - 3, Math.ceil(L.cx + L.rx + 2)); c++) {
                    if (grid[l][c].tipo === 'mont') continue;
                    // Proteção do ponto de teleporte (c: 5, l: 25)
                    if (c >= 3 && c <= 7 && l >= 23 && l <= 27) continue;
                    // Proteção da entrada da garganta do deserto (c: 2..4, l: 200..215)
                    if (c <= 4 && l >= GATE_L0 - 2 && l <= GATE_L1 + 2) continue;
                    // Proteção do portal de retorno a Davahl (c: 48..52, l: 110..114)
                    if (c >= 48 && c <= 52 && l >= 110 && l <= 114) continue;

                    const dx = (c + 0.5 - L.cx) / L.rx;
                    const dy = (l + 0.5 - L.cy) / L.ry;
                    const distSq = dx * dx + dy * dy;
                    if (distSq <= 1.0) {
                        marcar(c, l, 'veneno');
                    } else if (distSq <= 1.45 && grid[l][c].tipo === 'lodo') {
                        marcar(c, l, 'turfa');
                    }
                }
            }
        }

        // 4) Passarelas de Madeira Podre (Boardwalks)
        function criarPassarelaLinha(c0, l0, c1, l1) {
            const steps = Math.max(Math.abs(c1 - c0), Math.abs(l1 - l0)) * 2;
            for (let i = 0; i <= steps; i++) {
                const frac = steps > 0 ? (i / steps) : 0;
                const c = Math.round(c0 + (c1 - c0) * frac);
                const l = Math.round(l0 + (l1 - l0) * frac);
                if (c >= 2 && c < COLS - 2 && l >= 0 && l < ROWS) {
                    marcar(c, l, 'boardwalk');
                }
            }
        }

        // Passarela do Local 1: Spawn de teleporte (c: 5, l: 25) ligando ao Posto das Brumas
        criarPassarelaLinha(4, 25, 14, 25);
        criarPassarelaLinha(14, 25, 14, 29);

        // Passarelas do Local 2: Vilarejo Palafita Submerso
        criarPassarelaLinha(56, 60, 64, 60);
        criarPassarelaLinha(64, 60, 72, 60);
        criarPassarelaLinha(64, 54, 64, 66);
        criarPassarelaLinha(70, 58, 76, 64);

        // Passarela do Local 4: Pescador e Portal de Davahl (c: 50, l: 112)
        criarPassarelaLinha(44, 112, 53, 112);
        criarPassarelaLinha(47, 112, 47, 116);

        // Passarela do Local 5: Feitoria Central
        criarPassarelaLinha(112, 115, 126, 115);
        criarPassarelaLinha(120, 110, 120, 118);

        // Passarela do Local 7: Entrada da Garganta do Deserto
        criarPassarelaLinha(2, 207, 15, 207);

        // Passarela do Local 8: Coletores do Sul
        criarPassarelaLinha(82, 195, 96, 195);

        // 5) Catálogo de 8 Locais Temáticos de Cabanas Arruinadas
        cabanasInfo = [
            // 1. Posto das Brumas do Norte (ao lado da passarela de chegada)
            { id: 'posto_brumas', x: PAN_X0 + 14 * TILE, y: 24 * TILE, tipoCabana: 'posto_arruinado', w: 140, h: 100, rot: -0.05 },
            // 2. Vilarejo Palafita Submerso (Complexo de 3 cabanas arruinadas interligadas)
            { id: 'vila_principal', x: PAN_X0 + 64 * TILE, y: 56 * TILE, tipoCabana: 'cabana_grande', w: 180, h: 120, rot: 0.04 },
            { id: 'vila_armazem', x: PAN_X0 + 71 * TILE, y: 61 * TILE, tipoCabana: 'armazem_podre', w: 120, h: 90, rot: -0.06 },
            { id: 'vila_choca', x: PAN_X0 + 61 * TILE, y: 65 * TILE, tipoCabana: 'choca_pescador', w: 100, h: 80, rot: 0.08 },
            // 3. Choça da Bruxa do Pântano / Santuário do Eremita
            { id: 'choca_bruxa', x: PAN_X0 + 145 * TILE, y: 44 * TILE, tipoCabana: 'choca_bruxa', w: 130, h: 100, rot: -0.07 },
            // 4. Choça do Pescador Perdido (Próximo ao Portal de Davahl)
            { id: 'choca_pescador_portal', x: PAN_X0 + 47 * TILE, y: 115 * TILE, tipoCabana: 'choca_pescador', w: 110, h: 85, rot: 0.06 },
            // 5. Feitoria Abandonada do Brejo Central
            { id: 'feitoria_central', x: PAN_X0 + 120 * TILE, y: 112 * TILE, tipoCabana: 'cabana_grande', w: 160, h: 110, rot: -0.04 },
            // 6. Choça do Cemitério de Barcos das Águas Negras
            { id: 'choca_barcos', x: PAN_X0 + 160 * TILE, y: 156 * TILE, tipoCabana: 'choca_pescador', w: 110, h: 85, rot: -0.05 },
            // 7. Posto dos Batedores da Garganta Ocidental
            { id: 'posto_garganta', x: PAN_X0 + 15 * TILE, y: 204 * TILE, tipoCabana: 'posto_arruinado', w: 120, h: 90, rot: 0.04 },
            // 8. Choça dos Coletores de Turfa do Sul
            { id: 'choca_turfa', x: PAN_X0 + 90 * TILE, y: 191 * TILE, tipoCabana: 'armazem_podre', w: 130, h: 95, rot: -0.03 }
        ];

        // 6) Barcos e Canoas Semi-Submersas nas Lagoas
        const canoas = [
            { x: PAN_X0 + 48 * TILE, y: 117 * TILE, rot: 0.35, afundada: 0.7 },
            { x: PAN_X0 + 67 * TILE, y: 64 * TILE, rot: -0.4, afundada: 0.6 },
            { x: PAN_X0 + 158 * TILE, y: 163 * TILE, rot: 0.6, afundada: 0.8 },
            { x: PAN_X0 + 163 * TILE, y: 161 * TILE, rot: -0.2, afundada: 0.5 },
            { x: PAN_X0 + 92 * TILE, y: 198 * TILE, rot: 0.45, afundada: 0.65 }
        ];

        // 7) Geração Densa de Árvores com Z-Sorting Real e Grid Espacial de Colisões
        sortables = [];
        colisoesGrid = [];
        for (let l = 0; l < ROWS; l++) {
            colisoesGrid[l] = [];
            for (let c = 0; c < COLS; c++) {
                colisoesGrid[l][c] = [];
            }
        }

        function adicionarColisaoGrid(tipo, x, y, r, minX, maxX, minY, maxY, x1, y1, x2, y2) {
            let bx0 = 0, bx1 = 0, by0 = 0, by1 = 0;
            if (tipo === 'circle') {
                bx0 = x - r; bx1 = x + r;
                by0 = y - r; by1 = y + r;
            } else if (tipo === 'box') {
                bx0 = minX; bx1 = maxX;
                by0 = minY; by1 = maxY;
            } else if (tipo === 'segment') {
                bx0 = Math.min(x1, x2) - r; bx1 = Math.max(x1, x2) + r;
                by0 = Math.min(y1, y2) - r; by1 = Math.max(y1, y2) + r;
            }
            const c0 = Math.max(0, Math.floor((bx0 - PAN_X0) / TILE));
            const c1 = Math.min(COLS - 1, Math.floor((bx1 - PAN_X0) / TILE));
            const l0 = Math.max(0, Math.floor(by0 / TILE));
            const l1 = Math.min(ROWS - 1, Math.floor(by1 / TILE));

            const item = { tipo, x, y, r, minX, maxX, minY, maxY, x1, y1, x2, y2 };
            for (let l = l0; l <= l1; l++) {
                for (let c = c0; c <= c1; c++) {
                    colisoesGrid[l][c].push(item);
                }
            }
        }

        // Adiciona as Cabanas nos sortables (divididas em Base e Telhado) e registra paredes sólidas
        for (let i = 0; i < cabanasInfo.length; i++) {
            const cb = cabanasInfo[i];
            const w = cb.w || 140;
            const h = cb.h || 100;
            const anchorY = cb.y + h * 0.85;

            // Camada 1: Piso / Palafitas / Deck (Base - sorteado antes do jogador na varanda)
            sortables.push({
                tipo: 'cabana_base',
                subtipo: cb.tipoCabana,
                x: cb.x,
                base: cb.y + h * 0.45,
                anchorY: anchorY,
                w: w,
                h: h,
                rot: cb.rot
            });

            // Camada 2: Telhado / Vigas (Foreground - sorteado acima do jogador)
            sortables.push({
                tipo: 'cabana_telhado',
                subtipo: cb.tipoCabana,
                x: cb.x,
                base: cb.y + h + 8,
                anchorY: anchorY,
                w: w,
                h: h,
                rot: cb.rot
            });

            // Colisão sólida das paredes da cabana
            const colW = Math.round(w * 0.84);
            const colH = Math.round(h * 0.52);
            const colMinX = Math.round(cb.x - colW / 2);
            const colMaxX = Math.round(cb.x + colW / 2);
            const colMinY = Math.round(cb.y + 12);
            const colMaxY = Math.round(cb.y + 12 + colH);
            adicionarColisaoGrid('box', 0, 0, 0, colMinX, colMaxX, colMinY, colMaxY);
        }

        // Adiciona as Canoas nos sortables e registra colisão do casco
        for (let i = 0; i < canoas.length; i++) {
            const cn = canoas[i];
            sortables.push({
                tipo: 'canoa',
                x: cn.x,
                base: cn.y + 10,
                rot: cn.rot,
                afundada: cn.afundada
            });
            adicionarColisaoGrid('box', 0, 0, 0, cn.x - 28, cn.x + 28, cn.y + 2, cn.y + 20);
        }

        // Centenas de Árvores: Ciprestes-Calvos, Salgueiros com Barba-de-Velho e Troncos Ocos
        const nCiprestes = 150;
        let cCount = 0;
        while (cCount < nCiprestes) {
            const c = 3 + Math.floor(rnd() * (COLS - 6));
            const l = 2 + Math.floor(rnd() * (ROWS - 6));
            // Evitar spawn direto no spawn do jogador
            if (c >= 4 && c <= 6 && l >= 24 && l <= 26) continue;
            if (grid[l][c].tipo === 'mont' || grid[l][c].tipo === 'boardwalk') continue;

            const wx = PAN_X0 + c * TILE + (rnd() * 20 - 10);
            const wy = l * TILE + (rnd() * 20 - 10);
            const escala = 0.85 + rnd() * 0.35;
            const rCol = Math.max(12, Math.round(16 * escala));
            sortables.push({
                tipo: 'cipreste',
                x: wx,
                base: wy + 16,
                escala: escala,
                variacao: Math.floor(rnd() * 3),
                joelhos: Math.floor(3 + rnd() * 4)
            });
            adicionarColisaoGrid('circle', wx, wy + 12, rCol);
            cCount++;
        }

        const nSalgueiros = 130;
        let sCount = 0;
        while (sCount < nSalgueiros) {
            const c = 3 + Math.floor(rnd() * (COLS - 6));
            const l = 2 + Math.floor(rnd() * (ROWS - 6));
            if (c >= 4 && c <= 6 && l >= 24 && l <= 26) continue;
            if (grid[l][c].tipo === 'mont' || grid[l][c].tipo === 'boardwalk') continue;

            const wx = PAN_X0 + c * TILE + (rnd() * 20 - 10);
            const wy = l * TILE + (rnd() * 20 - 10);
            const escala = 0.85 + rnd() * 0.3;
            const rCol = Math.max(11, Math.round(14 * escala));
            sortables.push({
                tipo: 'salgueiro',
                x: wx,
                base: wy + 14,
                escala: escala,
                festoes: Math.floor(5 + rnd() * 4)
            });
            adicionarColisaoGrid('circle', wx, wy + 10, rCol);
            sCount++;
        }

        const nTroncos = 80;
        let tCount = 0;
        while (tCount < nTroncos) {
            const c = 3 + Math.floor(rnd() * (COLS - 6));
            const l = 2 + Math.floor(rnd() * (ROWS - 6));
            if (grid[l][c].tipo === 'mont' || grid[l][c].tipo === 'boardwalk') continue;

            const wx = PAN_X0 + c * TILE + (rnd() * 20 - 10);
            const wy = l * TILE + (rnd() * 20 - 10);
            const comp = 45 + rnd() * 35;
            const rot = (rnd() - 0.5) * 1.2;
            sortables.push({
                tipo: 'tronco_morto',
                x: wx,
                base: wy + 10,
                rot: rot,
                comprimento: comp
            });
            const hcomp = comp / 2;
            const x1 = wx - Math.cos(rot) * hcomp;
            const y1 = wy + 10 - Math.sin(rot) * hcomp;
            const x2 = wx + Math.cos(rot) * hcomp;
            const y2 = wy + 10 + Math.sin(rot) * hcomp;
            adicionarColisaoGrid('segment', 0, 0, 9, 0, 0, 0, 0, x1, y1, x2, y2);
            tCount++;
        }

        // Tufos de Taboas (Cattails) nas margens de água
        const nTaboas = 220;
        let tbCount = 0;
        while (tbCount < nTaboas) {
            const c = 2 + Math.floor(rnd() * (COLS - 4));
            const l = 2 + Math.floor(rnd() * (ROWS - 4));
            if (grid[l][c].tipo === 'veneno' || grid[l][c].tipo === 'turfa') {
                const wx = PAN_X0 + c * TILE + rnd() * TILE;
                const wy = l * TILE + rnd() * TILE;
                sortables.push({
                    tipo: 'taboa',
                    x: wx,
                    base: wy + 6,
                    hastes: 3 + Math.floor(rnd() * 4)
                });
                tbCount++;
            }
        }

        // Rochas com musgo
        let rCount = 0;
        while (rCount < 100) {
            const c = 2 + Math.floor(rnd() * (COLS - 4));
            const l = 2 + Math.floor(rnd() * (ROWS - 4));
            if (grid[l][c].tipo === 'lodo' || grid[l][c].tipo === 'turfa') {
                const rx = PAN_X0 + c * TILE + TILE / 2;
                const ry = l * TILE + TILE - 4;
                sortables.push({
                    tipo: 'rocha_musgo',
                    x: rx,
                    base: ry
                });
                adicionarColisaoGrid('circle', rx, ry - 4, 14);
                rCount++;
            }
        }

        // 8) Cogumelos e Juncos no chão (decor)
        decor = [];
        const nDecor = 500;
        for (let i = 0; i < nDecor; i++) {
            const c = Math.floor(rnd() * COLS);
            const l = Math.floor(rnd() * ROWS);
            if (grid[l][c].tipo === 'mont' || grid[l][c].tipo === 'boardwalk') continue;
            decor.push({
                x: PAN_X0 + c * TILE + 4 + rnd() * (TILE - 8),
                y: l * TILE + 4 + rnd() * (TILE - 8),
                tipo: rnd() < 0.5 ? 'cogumelo_bio' : 'reid',
                s: rnd()
            });
        }

        // 9) Efeitos Atmosféricos Vivos: Bolhas de Gás Metano
        bolhasMetano = [];
        const nBolhas = 70;
        for (let i = 0; i < nBolhas; i++) {
            const lago = lagosInfo[Math.floor(rnd() * lagosInfo.length)];
            const ang = rnd() * Math.PI * 2;
            const dist = rnd() * (lago.rx * 0.85);
            bolhasMetano.push({
                x: PAN_X0 + (lago.cx + Math.cos(ang) * dist) * TILE,
                y: (lago.cy + Math.sin(ang) * (dist * (lago.ry / lago.rx))) * TILE,
                raio: 2 + rnd() * 4,
                tempoVida: 2.0 + rnd() * 3.0,
                fase: rnd() * 10
            });
        }

        // 10) Sistema de Vagalumes Vivos (Animados, Voando e Piscando Aleatoriamente)
        vagalumes = [];
        const nVagalumes = 100;
        for (let i = 0; i < nVagalumes; i++) {
            // Concentrados principalmente ao redor dos lagos e cabanas, e espalhados pelo mapa
            let bx, by;
            if (rnd() < 0.75 && lagosInfo.length > 0) {
                const lago = lagosInfo[Math.floor(rnd() * lagosInfo.length)];
                const ang = rnd() * Math.PI * 2;
                const r = (0.5 + rnd() * 1.2) * lago.rx * TILE;
                bx = PAN_X0 + lago.cx * TILE + Math.cos(ang) * r;
                by = lago.cy * TILE + Math.sin(ang) * (r * (lago.ry / lago.rx));
            } else {
                bx = PAN_X0 + 200 + rnd() * (PAN_X1 - PAN_X0 - 400);
                by = 200 + rnd() * (PAN_Y1 - 400);
            }
            vagalumes.push({
                x: bx,
                y: by,
                baseX: bx,
                baseY: by,
                raioOrbitaX: 40 + rnd() * 80,
                raioOrbitaY: 30 + rnd() * 60,
                velocidadeOrbita: 0.3 + rnd() * 0.7,
                faseOrbita: rnd() * Math.PI * 2,
                blinkFreq: 1.5 + rnd() * 2.0,
                blinkFase: rnd() * Math.PI * 2,
                tamanho: 1.6 + rnd() * 1.4,
                cor: rnd() < 0.65 ? '#c8ff40' : (rnd() < 0.5 ? '#80ff90' : '#ffe066')
            });
        }

        return grid;
    }

    // ---------- Reset ----------
    function resetarPantano() {
        grid = null;
        colisoesGrid = null;
        sortables = [];
        decor = [];
        bolhasMetano = [];
        vagalumes = [];
        if (global.mapaDeserto && typeof global.mapaDeserto.resetarDeserto === 'function') {
            global.mapaDeserto.resetarDeserto();
        }
        global.arvores = undefined;
    }

    // ---------- Colisão / Consulta ----------
    function isPantano(x) { return x >= PAN_X0 && x < PAN_X1; }

    function pontoColideSegmento(px, py, x1, y1, x2, y2, r) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const lenSq = dx * dx + dy * dy;
        if (lenSq === 0) return Math.hypot(px - x1, py - y1) < r;
        let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
        t = Math.max(0, Math.min(1, t));
        const nearX = x1 + t * dx;
        const nearY = y1 + t * dy;
        const ddx = px - nearX;
        const ddy = py - nearY;
        return (ddx * ddx + ddy * ddy) < (r * r);
    }

    function alcanceAltura(x, y, minimo, raio) {
        const amostras = [[0, 0], [raio, 0], [-raio, 0], [0, raio], [0, -raio]];
        for (let i = 0; i < amostras.length; i++) {
            const px = x + amostras[i][0];
            const py = y + amostras[i][1];
            if (px < PAN_X0 || px >= PAN_X1) continue;
            const c = Math.floor((px - PAN_X0) / TILE);
            const l = Math.floor(py / TILE);
            if (c < 0 || c >= COLS || l < 0 || l >= ROWS) continue;
            if (grid[l][c].alt >= minimo) return true;
        }
        return false;
    }

    function colidePantano(x, y, raio) {
        if (!grid) gerarPantano();
        if (x < PAN_X0 || x >= PAN_X1) return false;
        // Ponto de spawn de teleporte é sempre seguro
        if (x >= 50160 && x <= 50240 && y >= 960 && y <= 1040) return false;
        const r = (typeof raio === 'number') ? raio : 8;

        // 1) Montanhas e limites do grid
        if (alcanceAltura(x, y, ALT_PEQUENA, r)) return true;

        // 2) Colisão com entidades físicas (árvores, cabanas, troncos e rochas)
        if (colisoesGrid) {
            const minC = Math.max(0, Math.floor((x - PAN_X0 - r - 8) / TILE));
            const maxC = Math.min(COLS - 1, Math.floor((x - PAN_X0 + r + 8) / TILE));
            const minL = Math.max(0, Math.floor((y - r - 8) / TILE));
            const maxL = Math.min(ROWS - 1, Math.floor((y + r + 8) / TILE));

            for (let l = minL; l <= maxL; l++) {
                const row = colisoesGrid[l];
                if (!row) continue;
                for (let c = minC; c <= maxC; c++) {
                    const cel = row[c];
                    if (!cel || !cel.length) continue;
                    for (let i = 0; i < cel.length; i++) {
                        const ob = cel[i];
                        if (ob.tipo === 'circle') {
                            const dx = x - ob.x;
                            const dy = y - ob.y;
                            const rTot = ob.r + r;
                            if (dx * dx + dy * dy < rTot * rTot) return true;
                        } else if (ob.tipo === 'box') {
                            if (x + r >= ob.minX && x - r <= ob.maxX && y + r >= ob.minY && y - r <= ob.maxY) return true;
                        } else if (ob.tipo === 'segment') {
                            if (pontoColideSegmento(x, y, ob.x1, ob.y1, ob.x2, ob.y2, ob.r + r)) return true;
                        }
                    }
                }
            }
        }

        return false;
    }

    function colideProjetilPantano(x, y) {
        if (!grid) gerarPantano();
        if (x < PAN_X0 || x >= PAN_X1) return false;
        return colidePantano(x, y, 6);
    }

    function ehVenenoPantano(x, y) {
        if (!grid || x < PAN_X0 || x >= PAN_X1) return false;
        const c = Math.floor((x - PAN_X0) / TILE);
        const l = Math.floor(y / TILE);
        if (c < 0 || c >= COLS || l < 0 || l >= ROWS) return false;
        // Se for passarela de madeira, o jogador está sobre a ponte e não na água venenosa!
        if (grid[l][c].tipo === 'boardwalk') return false;
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
        if (x < PAN_X0 || x >= PAN_X1) return null;
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
        if (x >= PAN_X0 && x < PAN_X1) {
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

    // ---------- Renderização Gráfica Realista de Alta Fidelidade ----------
    const COR_LODO = '#1c2616';
    const COR_TURFA = '#28361e';
    const COR_LAMA_MOVEDICA = '#141c10';
    const COR_AGUA_VENENO = '#102214';

    function desenharCenarioPantano(t) {
        const ctx = global.ctx;
        if (!ctx) return;

        let camX = global.camX || 0;
        let camY = global.camY || 0;
        let cw = (global.canvas && global.canvas.width) || (global.innerWidth || 800);
        let ch = (global.canvas && global.canvas.height) || (global.innerHeight || 600);
        cw = cw / (global.ZOOM_CAMERA || 1);
        ch = ch / (global.ZOOM_CAMERA || 1);

        if (!grid) gerarPantano();

        // 1) Frustum Culling de Tiles
        const c0 = Math.max(0, Math.floor((camX - PAN_X0 - 40) / TILE));
        const c1 = Math.min(COLS - 1, Math.ceil((camX - PAN_X0 + cw + 40) / TILE));
        const l0 = Math.max(0, Math.floor((camY - 40) / TILE));
        const l1 = Math.min(ROWS - 1, Math.ceil((camY + ch + 40) / TILE));

        // Fundo base
        ctx.fillStyle = COR_LODO;
        ctx.fillRect(camX, camY, cw, ch);

        // Render dos tiles de chão
        for (let l = l0; l <= l1; l++) {
            for (let c = c0; c <= c1; c++) {
                const cel = grid[l][c];
                const x = PAN_X0 + c * TILE;
                const y = l * TILE;

                if (cel.tipo === 'mont') {
                    desenharMontanhaMusgo(ctx, x, y, c, l);
                } else if (cel.tipo === 'veneno') {
                    desenharAguaVeneno(ctx, x, y, c, l, t);
                } else if (cel.tipo === 'boardwalk') {
                    desenharBoardwalk(ctx, x, y, c, l);
                } else {
                    desenharChaoLodoTurfa(ctx, x, y, c, l, cel.tipo);
                }
            }
        }

        // 2) Decorações no Chão (Juncos e Fungos)
        for (let i = 0; i < decor.length; i++) {
            const d = decor[i];
            if (d.x < camX - 20 || d.x > camX + cw + 20 || d.y < camY - 20 || d.y > camY + ch + 20) continue;
            desenharDecorItem(ctx, d, t);
        }

        // 3) Bolhas de Gás Metano nas Lagoas
        for (let i = 0; i < bolhasMetano.length; i++) {
            const b = bolhasMetano[i];
            if (b.x < camX - 40 || b.x > camX + cw + 40 || b.y < camY - 40 || b.y > camY + ch + 40) continue;
            desenharBolhaMetano(ctx, b, t);
        }

        // 4) Névoa Rasteira Volumétrica
        desenharNevoaRasteira(ctx, camX, camY, cw, ch, t);

        // 5) Vagalumes Vivos Voando e Piscando
        desenharVagalumes(ctx, camX, camY, cw, ch, t);
    }

    function desenharChaoLodoTurfa(ctx, x, y, c, l, tipo) {
        if (tipo === 'turfa') {
            ctx.fillStyle = COR_TURFA;
            ctx.fillRect(x, y, TILE + 1, TILE + 1);
            ctx.fillStyle = 'rgba(70, 95, 45, 0.25)';
            const h = hash2(c, l);
            ctx.beginPath();
            ctx.ellipse(x + 10 + h * 20, y + 10 + h * 15, 12, 6, 0, 0, Math.PI * 2);
            ctx.fill();
        } else if (tipo === 'lama_movedica') {
            ctx.fillStyle = COR_LAMA_MOVEDICA;
            ctx.fillRect(x, y, TILE + 1, TILE + 1);
            ctx.fillStyle = 'rgba(10, 15, 8, 0.45)';
            ctx.beginPath();
            ctx.arc(x + 20, y + 20, 14, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Lodo com textura de musgo e pequenas poças
            ctx.fillStyle = COR_LODO;
            ctx.fillRect(x, y, TILE + 1, TILE + 1);
            const h = hash2(c, l);
            if (h > 0.6) {
                ctx.fillStyle = 'rgba(45, 65, 30, 0.35)';
                ctx.fillRect(x + 4, y + 4, 12, 8);
            }
        }
    }

    function desenharAguaVeneno(ctx, x, y, c, l, t) {
        // Água escura do pântano
        ctx.fillStyle = COR_AGUA_VENENO;
        ctx.fillRect(x, y, TILE + 1, TILE + 1);

        // Reflexos dinâmicos sombrios
        const onda = Math.sin(t * 1.5 + (x + y) * 0.05) * 1.5;
        ctx.fillStyle = 'rgba(30, 65, 38, 0.35)';
        ctx.fillRect(x + 2, y + 12 + onda, TILE - 4, 6);

        // Lentilhas-d'água (Duckweed) esmeralda
        const h1 = hash2(c * 13, l * 29);
        if (h1 > 0.35) {
            ctx.fillStyle = 'rgba(75, 140, 50, 0.75)';
            ctx.beginPath();
            ctx.arc(x + 8 + h1 * 14, y + 10 + h1 * 18, 2.2, 0, Math.PI * 2);
            ctx.arc(x + 18 + h1 * 10, y + 8 + h1 * 12, 1.8, 0, Math.PI * 2);
            ctx.arc(x + 26 + h1 * 6, y + 24, 2.0, 0, Math.PI * 2);
            ctx.fill();
        }

        // Colônias de Vitórias-Régias Flutuantes com Flores
        const h2 = hash2(c + 71, l + 43);
        if (h2 > 0.78) {
            // Folha circular de Vitória-Régia
            ctx.fillStyle = '#22552a';
            ctx.beginPath();
            ctx.arc(x + 20, y + 20, 11, 0.2, Math.PI * 1.95);
            ctx.lineTo(x + 20, y + 20);
            ctx.closePath();
            ctx.fill();
            // Borda levantada
            ctx.strokeStyle = '#387840';
            ctx.lineWidth = 1.2;
            ctx.stroke();

            // Flor aquática branca/rosada
            if (h2 > 0.88) {
                ctx.fillStyle = '#fce4ec';
                ctx.beginPath();
                ctx.arc(x + 20, y + 20, 3.2, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#f06292';
                ctx.beginPath();
                ctx.arc(x + 20, y + 20, 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    function desenharBoardwalk(ctx, x, y, c, l) {
        // Água ou lodo embaixo da passarela
        ctx.fillStyle = COR_LODO;
        ctx.fillRect(x, y, TILE + 1, TILE + 1);

        // Sombra projetada no chão
        ctx.fillStyle = 'rgba(6, 10, 6, 0.55)';
        ctx.fillRect(x + 2, y + 6, TILE - 4, TILE - 4);

        // Estacas de sustentação de madeira
        ctx.fillStyle = '#261b14';
        ctx.fillRect(x + 4, y + 2, 6, TILE - 4);
        ctx.fillRect(x + TILE - 10, y + 2, 6, TILE - 4);

        // Tábuas de madeira envelhecidas e carcomidas
        const h = hash2(c, l);
        ctx.fillStyle = (h > 0.5) ? '#4a3525' : '#3f2c1f';
        ctx.fillRect(x + 2, y + 3, TILE - 4, 10);
        ctx.fillStyle = (h > 0.3) ? '#423022' : '#4e3a2b';
        ctx.fillRect(x + 2, y + 15, TILE - 4, 10);
        ctx.fillStyle = (h > 0.6) ? '#38261a' : '#463223';
        ctx.fillRect(x + 2, y + 27, TILE - 4, 10);

        // Frestas e pregos oxidados
        ctx.fillStyle = '#1a120b';
        ctx.fillRect(x + 2, y + 13, TILE - 4, 2);
        ctx.fillRect(x + 2, y + 25, TILE - 4, 2);

        ctx.fillStyle = '#110c07';
        ctx.fillRect(x + 6, y + 7, 2, 2);
        ctx.fillRect(x + TILE - 8, y + 7, 2, 2);
        ctx.fillRect(x + 6, y + 19, 2, 2);
        ctx.fillRect(x + TILE - 8, y + 19, 2, 2);

        // Musgo nas beiradas
        if (h > 0.4) {
            ctx.fillStyle = 'rgba(70, 110, 45, 0.7)';
            ctx.fillRect(x + 2, y + 4, 3, 5);
            ctx.fillRect(x + TILE - 5, y + 20, 3, 6);
        }
    }

    function desenharMontanhaMusgo(ctx, x, y, c, l) {
        ctx.fillStyle = '#182014';
        ctx.fillRect(x, y, TILE + 1, TILE + 1);
        ctx.fillStyle = '#222d1a';
        ctx.beginPath();
        ctx.moveTo(x, y + TILE);
        ctx.lineTo(x + TILE / 2, y + 6);
        ctx.lineTo(x + TILE, y + TILE);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#2e3d24';
        ctx.beginPath();
        ctx.moveTo(x + TILE * 0.45, y + TILE);
        ctx.lineTo(x + TILE * 0.7, y + 16);
        ctx.lineTo(x + TILE, y + TILE);
        ctx.closePath();
        ctx.fill();
    }

    function desenharDecorItem(ctx, d, t) {
        if (d.tipo === 'cogumelo_bio') {
            // Cogumelos bioluminescentes esmeralda/ciano
            const pulso = 0.6 + Math.sin(t * 2.5 + d.x * 0.1) * 0.35;
            ctx.fillStyle = '#2d241c';
            ctx.fillRect(d.x, d.y - 4, 2.5, 5);

            ctx.fillStyle = `rgba(80, 255, 180, ${pulso})`;
            ctx.beginPath();
            ctx.arc(d.x + 1, d.y - 5, 3.5, Math.PI, 0);
            ctx.fill();

            // Halo suave
            ctx.fillStyle = `rgba(60, 220, 160, ${pulso * 0.25})`;
            ctx.beginPath();
            ctx.arc(d.x + 1, d.y - 5, 7, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Juncos oscilando com o vento
            const f = Math.sin(t * 2.0 + d.x * 0.08) * 2.0;
            ctx.strokeStyle = 'rgba(90, 130, 60, 0.75)';
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(d.x - 2, d.y); ctx.lineTo(d.x - 2 + f, d.y - 9);
            ctx.moveTo(d.x + 2, d.y); ctx.lineTo(d.x + 2 + f, d.y - 7);
            ctx.stroke();
        }
    }

    function desenharBolhaMetano(ctx, b, t) {
        const ciclo = (t * 0.6 + b.fase) % b.tempoVida;
        const progresso = ciclo / b.tempoVida; // 0..1
        if (progresso < 0.8) {
            // Bolha subindo e inflando
            const alfa = Math.sin(progresso / 0.8 * Math.PI) * 0.75;
            const r = b.raio * (0.4 + progresso * 0.6);
            ctx.fillStyle = `rgba(140, 210, 120, ${alfa * 0.4})`;
            ctx.beginPath();
            ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = `rgba(180, 255, 160, ${alfa * 0.8})`;
            ctx.lineWidth = 1;
            ctx.stroke();
            // Brilho especular
            ctx.fillStyle = `rgba(255, 255, 255, ${alfa * 0.85})`;
            ctx.beginPath();
            ctx.arc(b.x - r * 0.35, b.y - r * 0.35, r * 0.25, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Estouro com anel de gás e vapor tênue
            const estouro = (progresso - 0.8) / 0.2; // 0..1
            const r = b.raio + estouro * 10;
            const alfa = (1 - estouro) * 0.5;
            ctx.strokeStyle = `rgba(160, 240, 140, ${alfa})`;
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
            ctx.stroke();
            // Fumaça tênue subindo
            ctx.fillStyle = `rgba(180, 220, 160, ${alfa * 0.35})`;
            ctx.beginPath();
            ctx.arc(b.x, b.y - estouro * 14, 5 + estouro * 6, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function desenharNevoaRasteira(ctx, camX, camY, cw, ch, t) {
        ctx.save();
        ctx.globalAlpha = 0.14;
        const drift = t * 15;
        const grad = ctx.createLinearGradient(0, camY, 0, camY + ch);
        grad.addColorStop(0, 'rgba(80, 120, 90, 0.0)');
        grad.addColorStop(0.5, 'rgba(100, 140, 100, 0.45)');
        grad.addColorStop(1, 'rgba(60, 90, 70, 0.1)');
        ctx.fillStyle = grad;

        // Bandas horizontais de névoa deslocando-se suavemente
        for (let j = 0; j < 3; j++) {
            const ny = camY + (j * 200 + ((t * 8 + j * 70) % ch));
            const nx = camX - 100 + Math.sin(t * 0.5 + j) * 80;
            ctx.fillRect(nx, ny, cw + 200, 50);
        }
        ctx.restore();
    }

    // ---------- Animação dos Vagalumes (Piscando e Voando Aleatoriamente) ----------
    function desenharVagalumes(ctx, camX, camY, cw, ch, t) {
        for (let i = 0; i < vagalumes.length; i++) {
            const v = vagalumes[i];

            // Movimento orgânico tridimensional suave (senóides combinadas + deriva circular)
            const ang = t * v.velocidadeOrbita + v.faseOrbita;
            const wx = v.baseX + Math.cos(ang) * v.raioOrbitaX + Math.sin(t * 1.1 + v.faseOrbita) * 20;
            const wy = v.baseY + Math.sin(ang) * v.raioOrbitaY + Math.cos(t * 0.9 + v.faseOrbita) * 15;

            // Frustum Culling
            if (wx < camX - 30 || wx > camX + cw + 30 || wy < camY - 30 || wy > camY + ch + 30) continue;

            // Ciclo de piscar e pulsação bioluminescente
            const ondaBlink = Math.sin(t * v.blinkFreq + v.blinkFase);
            // Elevar ao cubo para criar lampejos rápidos e nítidos (estilo vagalume real)
            const intensidade = Math.max(0, Math.pow(Math.max(0, ondaBlink), 3));
            if (intensidade <= 0.04) continue;

            ctx.save();
            // Halo de luz difusa
            ctx.fillStyle = 'rgba(180, 255, 80, ' + (intensidade * 0.22).toFixed(3) + ')';
            ctx.beginPath();
            ctx.arc(wx, wy, 12 * v.tamanho * intensidade, 0, Math.PI * 2);
            ctx.fill();

            // Halo médio brilhante
            ctx.fillStyle = 'rgba(210, 255, 110, ' + (intensidade * 0.55).toFixed(3) + ')';
            ctx.beginPath();
            ctx.arc(wx, wy, 4.5 * v.tamanho, 0, Math.PI * 2);
            ctx.fill();

            // Núcleo incandescente central
            ctx.fillStyle = v.cor;
            ctx.beginPath();
            ctx.arc(wx, wy, 1.8 * v.tamanho, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    // ---------------- Sprites y-sort (2.5D com Frustum Culling) ----------------
    function coletarPantanoSortables(t, arr) {
        if (!grid) gerarPantano();
        const camX = global.camX || 0;
        const camY = global.camY || 0;
        const cw = (global.canvas && global.canvas.width) ? (global.canvas.width / (global.ZOOM_CAMERA || 1)) : 900;
        const ch = (global.canvas && global.canvas.height) ? (global.canvas.height / (global.ZOOM_CAMERA || 1)) : 600;

        for (let i = 0; i < sortables.length; i++) {
            const s = sortables[i];
            if (s.x < camX - 220 || s.x > camX + cw + 220 || s.base < camY - 240 || s.base > camY + ch + 60) continue;

            arr.push({
                y: s.base,
                draw: (function (spr, tm) {
                    return function () {
                        const ctx = global.ctx;
                        if (!ctx) return;
                        if (spr.tipo === 'cabana_base') desenharCabanaBase(ctx, spr, tm);
                        else if (spr.tipo === 'cabana_telhado') desenharCabanaTelhado(ctx, spr, tm);
                        else if (spr.tipo === 'cabana') desenharCabanaArruinada(ctx, spr, tm);
                        else if (spr.tipo === 'canoa') desenharCanoaSubmersa(ctx, spr, tm);
                        else if (spr.tipo === 'cipreste') desenharCipresteAncestral(ctx, spr, tm);
                        else if (spr.tipo === 'salgueiro') desenharSalgueiroChorao(ctx, spr, tm);
                        else if (spr.tipo === 'tronco_morto') desenharTroncoMorto(ctx, spr, tm);
                        else if (spr.tipo === 'taboa') desenharTaboas(ctx, spr, tm);
                        else if (spr.tipo === 'rocha_musgo') desenharRochaMusgo(ctx, spr, tm);
                    };
                })(s, t)
            });
        }
    }

    // --- Renderizador de Cabanas Arruinadas de Madeira (2 Camadas: Base/Piso e Telhado) ---
    function desenharCabanaBase(ctx, s, t) {
        ctx.save();
        const oy = s.anchorY || s.base;
        ctx.translate(s.x, oy);
        ctx.rotate(s.rot || 0);

        const w = s.w || 140;
        const h = s.h || 100;
        const hw = w / 2;

        // 1) Sombra no solo/água
        ctx.fillStyle = 'rgba(6, 10, 6, 0.5)';
        ctx.beginPath();
        ctx.ellipse(0, 4, hw + 15, 20, 0, 0, Math.PI * 2);
        ctx.fill();

        // 2) Palafitas de sustentação inclinadas
        ctx.fillStyle = '#261b14';
        for (let px = -hw + 15; px <= hw - 15; px += 35) {
            ctx.fillRect(px - 4, -15, 8, 20);
        }

        // 3) Deck e piso de tábuas de madeira tortas
        ctx.fillStyle = '#3a2b1f';
        ctx.fillRect(-hw, -h * 0.65, w, h * 0.55);

        // Frestas e tábuas individuais
        ctx.fillStyle = '#1c140e';
        for (let py = -h * 0.6; py <= -18; py += 12) {
            ctx.fillRect(-hw + 4, py, w - 8, 2);
        }

        // 4) Varanda Tombada e Barris Podres
        ctx.fillStyle = '#2b1e15';
        ctx.fillRect(-hw + 10, -14, 50, 10);

        // Barris apodrecidos
        ctx.fillStyle = '#36271c';
        ctx.fillRect(hw - 32, -22, 16, 22);
        ctx.fillStyle = '#1f150e';
        ctx.fillRect(hw - 32, -18, 16, 2);
        ctx.fillRect(hw - 32, -8, 16, 2);

        // Musgo na varanda
        ctx.fillStyle = 'rgba(75, 115, 50, 0.7)';
        ctx.fillRect(-hw + 18, -16, 20, 3);
        ctx.restore();
    }

    function desenharCabanaTelhado(ctx, s, t) {
        ctx.save();
        const oy = s.anchorY || (s.base - 8);
        ctx.translate(s.x, oy);
        ctx.rotate(s.rot || 0);

        const w = s.w || 140;
        const h = s.h || 100;
        const hw = w / 2;

        // X-ray inteligente: se o jogador estiver sob a cobertura do telhado
        const px = (typeof global.meuX === 'number' ? global.meuX : 0) + 12;
        const py = (typeof global.meuY === 'number' ? global.meuY : 0) + 16;
        const sobTelhado = (px >= s.x - hw - 12 && px <= s.x + hw + 12 && py >= oy - h - 15 && py <= oy + 6);
        if (sobTelhado) {
            ctx.globalAlpha = 0.52;
        }

        // Telhado Desabado com Vigas e Caibros Expostos
        ctx.fillStyle = '#4a3828';
        ctx.beginPath();
        ctx.moveTo(-hw - 10, -h * 0.65);
        ctx.lineTo(-5, -h);
        ctx.lineTo(hw + 10, -h * 0.55); // lado direito desabado
        ctx.closePath();
        ctx.fill();

        // Caibros de madeira expostos
        ctx.strokeStyle = '#281d14';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(-hw - 5, -h * 0.65); ctx.lineTo(-5, -h);
        ctx.moveTo(-hw * 0.5, -h * 0.75); ctx.lineTo(-5, -h);
        ctx.moveTo(0, -h); ctx.lineTo(hw * 0.4, -h * 0.6);
        ctx.moveTo(hw * 0.2, -h * 0.85); ctx.lineTo(hw + 8, -h * 0.55);
        ctx.stroke();

        // Restos de palha e tábuas podres pendentes
        ctx.fillStyle = '#5c4832';
        ctx.fillRect(-hw, -h * 0.63, 30, 8);
        ctx.fillRect(hw - 35, -h * 0.56, 25, 7);

        // Musgo acumulado no telhado
        ctx.fillStyle = 'rgba(75, 115, 50, 0.7)';
        ctx.fillRect(-hw + 8, -h * 0.67, 24, 4);

        ctx.restore();
    }

    function desenharCabanaArruinada(ctx, s, t) {
        desenharCabanaBase(ctx, s, t);
        desenharCabanaTelhado(ctx, s, t);
    }

    // --- Renderizador de Choça do Pescador e Canoa Semi-Submersa ---
    function desenharCanoaSubmersa(ctx, s, t) {
        ctx.save();
        ctx.translate(s.x, s.base);
        ctx.rotate(s.rot || 0);

        // Sombra na água
        ctx.fillStyle = 'rgba(5, 10, 6, 0.55)';
        ctx.beginPath();
        ctx.ellipse(0, 4, 38, 12, 0, 0, Math.PI * 2);
        ctx.fill();

        // Casco de madeira podre
        ctx.fillStyle = '#332317';
        ctx.beginPath();
        ctx.moveTo(-35, 0);
        ctx.quadraticCurveTo(0, 14, 35, 0);
        ctx.quadraticCurveTo(0, -10, -35, 0);
        ctx.closePath();
        ctx.fill();

        // Interior da canoa inundado
        ctx.fillStyle = COR_AGUA_VENENO;
        ctx.beginPath();
        ctx.ellipse(4, 2, 26, 7, 0, 0, Math.PI * 2);
        ctx.fill();

        // Tábuas quebradas e fendas no casco
        ctx.strokeStyle = '#1a110a';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(-10, -3); ctx.lineTo(-4, 6);
        ctx.moveTo(8, -2); ctx.lineTo(14, 7);
        ctx.stroke();

        // Lentilhas-d'água dentro da canoa
        ctx.fillStyle = 'rgba(80, 145, 55, 0.8)';
        ctx.beginPath();
        ctx.arc(0, 2, 2.4, 0, Math.PI * 2);
        ctx.arc(8, 3, 2.0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // --- Renderizador de Cipreste-Calvo com Raízes Aéreas ("Joelhos") ---
    function desenharCipresteAncestral(ctx, s, t) {
        ctx.save();
        ctx.translate(s.x, s.base);
        const sc = s.escala || 1.0;
        ctx.scale(sc, sc);

        // Sombra projetada
        ctx.fillStyle = 'rgba(6, 12, 6, 0.45)';
        ctx.beginPath();
        ctx.ellipse(0, 0, 36, 14, 0, 0, Math.PI * 2);
        ctx.fill();

        // Joelhos de cipreste (raízes aéreas cônicas saindo da lama/água)
        ctx.fillStyle = '#3a2c1f';
        const jCoords = [[-28, 4], [-20, -6], [-14, 8], [16, 6], [24, -4], [30, 5]];
        for (let i = 0; i < jCoords.length; i++) {
            const jx = jCoords[i][0];
            const jy = jCoords[i][1];
            ctx.beginPath();
            ctx.moveTo(jx - 4, jy);
            ctx.lineTo(jx, jy - 14);
            ctx.lineTo(jx + 4, jy);
            ctx.closePath();
            ctx.fill();
            // Ponta com musgo
            ctx.fillStyle = 'rgba(75, 110, 50, 0.8)';
            ctx.fillRect(jx - 2, jy - 14, 4, 3);
            ctx.fillStyle = '#3a2c1f';
        }

        // Base alada (buttressed trunk) alargada
        ctx.fillStyle = '#423223';
        ctx.beginPath();
        ctx.moveTo(-18, 0);
        ctx.quadraticCurveTo(-14, -25, -9, -60);
        ctx.lineTo(9, -60);
        ctx.quadraticCurveTo(14, -25, 18, 0);
        ctx.closePath();
        ctx.fill();

        // Tronco alto retorcido
        ctx.fillStyle = '#35271a';
        ctx.fillRect(-9, -135, 18, 75);

        // Ranhuras e musgo no tronco
        ctx.strokeStyle = '#22180f';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-4, -130); ctx.lineTo(-5, -60);
        ctx.moveTo(3, -125); ctx.lineTo(4, -50);
        ctx.stroke();

        // X-ray inteligente quando o jogador está atrás da copa do cipreste
        const px = (typeof global.meuX === 'number' ? global.meuX : 0) + 12;
        const py = (typeof global.meuY === 'number' ? global.meuY : 0) + 16;
        const atrasCopa = (py < s.base && Math.hypot(px - s.x, py - (s.base - 160 * sc)) < 58 * sc);
        if (atrasCopa) {
            ctx.globalAlpha = 0.48;
        }

        // Copa densa piramidal de folhas verde-oliva escuras
        ctx.fillStyle = '#1e2d17';
        ctx.beginPath();
        ctx.ellipse(0, -150, 38, 30, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#263a1e';
        ctx.beginPath();
        ctx.ellipse(0, -180, 28, 24, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#304726';
        ctx.beginPath();
        ctx.ellipse(0, -205, 18, 18, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // --- Renderizador de Salgueiro-Chorão com Barba-de-Velho Pendente ---
    function desenharSalgueiroChorao(ctx, s, t) {
        ctx.save();
        ctx.translate(s.x, s.base);
        const sc = s.escala || 1.0;
        ctx.scale(sc, sc);

        const bal = Math.sin(t * 1.4 + s.x * 0.05) * 3.0;

        // Sombra
        ctx.fillStyle = 'rgba(6, 12, 6, 0.45)';
        ctx.beginPath();
        ctx.ellipse(0, 0, 32, 12, 0, 0, Math.PI * 2);
        ctx.fill();

        // Tronco curvado inclinado
        ctx.strokeStyle = '#38281a';
        ctx.lineWidth = 14;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(-12, -45, -6, -95);
        ctx.stroke();

        // Galhos principais arqueados
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(-6, -95); ctx.quadraticCurveTo(-35, -115, -45, -85);
        ctx.moveTo(-6, -95); ctx.quadraticCurveTo(25, -120, 38, -90);
        ctx.stroke();

        // X-ray inteligente quando o jogador está atrás da copa do salgueiro
        const px = (typeof global.meuX === 'number' ? global.meuX : 0) + 12;
        const py = (typeof global.meuY === 'number' ? global.meuY : 0) + 16;
        const atrasCopa = (py < s.base && Math.hypot(px - (s.x - 6), py - (s.base - 100 * sc)) < 52 * sc);
        if (atrasCopa) {
            ctx.globalAlpha = 0.48;
        }

        // Copa de salgueiro
        ctx.fillStyle = '#21331a';
        ctx.beginPath();
        ctx.ellipse(-6, -110, 42, 26, 0, 0, Math.PI * 2);
        ctx.fill();

        // Festões pendentes de Barba-de-Velho (Spanish Moss) oscilando ao vento
        ctx.strokeStyle = 'rgba(100, 130, 95, 0.85)';
        ctx.lineWidth = 2.2;
        const festoesX = [-40, -28, -16, -4, 8, 20, 32];
        for (let i = 0; i < festoesX.length; i++) {
            const fx = festoesX[i];
            const comp = 40 + Math.sin(i * 1.7) * 15;
            ctx.beginPath();
            ctx.moveTo(fx, -95);
            ctx.quadraticCurveTo(fx + bal * 0.6, -95 + comp * 0.5, fx + bal, -95 + comp);
            ctx.stroke();
        }
        ctx.restore();
    }

    // --- Renderizador de Tronco Morto Caído e Oco com Fungos ---
    function desenharTroncoMorto(ctx, s, t) {
        ctx.save();
        ctx.translate(s.x, s.base);
        ctx.rotate(s.rot || 0);

        const comp = s.comprimento || 55;
        const hcomp = comp / 2;

        // Sombra
        ctx.fillStyle = 'rgba(5, 10, 5, 0.45)';
        ctx.beginPath();
        ctx.ellipse(0, 3, hcomp + 6, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Corpo do tronco carcomido
        ctx.fillStyle = '#3a2b1c';
        ctx.fillRect(-hcomp, -7, comp, 12);

        // Extremidade oca
        ctx.fillStyle = '#1c130c';
        ctx.beginPath();
        ctx.ellipse(-hcomp, -1, 4, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Fendas de podridão
        ctx.strokeStyle = '#18100a';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-hcomp + 10, -3); ctx.lineTo(-hcomp + 28, 2);
        ctx.moveTo(2, -4); ctx.lineTo(18, -1);
        ctx.stroke();

        // Cogumelos orelha-de-pau (shelf fungi) brotando na casca
        ctx.fillStyle = '#b87333';
        ctx.beginPath();
        ctx.arc(-10, -7, 4.5, Math.PI, 0);
        ctx.arc(6, -8, 5.5, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = 'rgba(235, 185, 130, 0.8)';
        ctx.beginPath();
        ctx.arc(-10, -7, 2.5, Math.PI, 0);
        ctx.arc(6, -8, 3.2, Math.PI, 0);
        ctx.fill();
        ctx.restore();
    }

    // --- Renderizador de Taboas (Cattails) ---
    function desenharTaboas(ctx, s, t) {
        ctx.save();
        ctx.translate(s.x, s.base);

        const bal = Math.sin(t * 2.2 + s.x * 0.1) * 2.2;
        const n = s.hastes || 4;

        for (let i = 0; i < n; i++) {
            const hx = (i - n / 2) * 5;
            const alt = 28 + (i % 3) * 6;

            // Haste verde
            ctx.strokeStyle = '#3e5c2d';
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(hx, 0);
            ctx.quadraticCurveTo(hx + bal * 0.4, -alt * 0.5, hx + bal, -alt);
            ctx.stroke();

            // Espiga marrom aveludada
            ctx.strokeStyle = '#4a2c14';
            ctx.lineWidth = 3.8;
            ctx.beginPath();
            ctx.moveTo(hx + bal * 0.85, -alt * 0.95);
            ctx.lineTo(hx + bal, -alt * 0.65);
            ctx.stroke();
        }
        ctx.restore();
    }

    // --- Renderizador de Rocha com Musgo ---
    function desenharRochaMusgo(ctx, s, t) {
        ctx.save();
        ctx.translate(s.x, s.base);

        ctx.fillStyle = 'rgba(6, 10, 6, 0.4)';
        ctx.beginPath();
        ctx.ellipse(0, 0, 18, 7, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#4a4e42';
        ctx.beginPath();
        ctx.moveTo(-16, 0);
        ctx.lineTo(-12, -12);
        ctx.lineTo(-2, -16);
        ctx.lineTo(12, -13);
        ctx.lineTo(16, -3);
        ctx.lineTo(14, 0);
        ctx.closePath();
        ctx.fill();

        // Manchas de musgo
        ctx.fillStyle = 'rgba(85, 125, 60, 0.85)';
        ctx.beginPath();
        ctx.arc(-6, -8, 4.5, 0, Math.PI * 2);
        ctx.arc(6, -11, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // --- Portais Rúnicos de Cipreste Ancestral ---
    function desenharPortalPantano(t) {
        const ctx = global.ctx;
        if (ctx) desenharVortexPantano(ctx, PORTA_RETORNO.x, PORTA_RETORNO.y, t, '#26734d', 'Retorno a Davahl');
    }

    function desenharPortalEntradaPantano(t) {
        const ctx = global.ctx;
        if (ctx) desenharVortexPantano(ctx, PORTA_ENTRADA.x, PORTA_ENTRADA.y, t, '#388e3c', 'Desfiladeiro do Deserto');
    }

    function desenharVortexPantano(ctx, x, y, t, cor, rotulo) {
        ctx.save();
        // Arco de Cipreste Ancestral
        ctx.strokeStyle = '#2b1c11';
        ctx.lineWidth = 10;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(x, y - 5, 48, Math.PI * 0.9, Math.PI * 2.1);
        ctx.stroke();

        // Runas de musgo brilhante esmeralda
        ctx.shadowColor = cor;
        ctx.shadowBlur = 18;
        ctx.strokeStyle = cor;
        ctx.lineWidth = 2.5;
        for (let i = 0; i < 4; i++) {
            const a = Math.PI * 1.05 + i * 0.32;
            const rx = x + Math.cos(a) * 48;
            const ry = y - 5 + Math.sin(a) * 48;
            ctx.beginPath();
            ctx.arc(rx, ry, 3.5, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Vórtice espiral interno
        ctx.fillStyle = 'rgba(10, 24, 14, 0.65)';
        ctx.beginPath();
        ctx.arc(x, y, 42, 0, Math.PI * 2);
        ctx.fill();

        for (let i = 0; i < 4; i++) {
            const raio = 14 + i * 7;
            const a0 = t * 1.6 + i * 1.3;
            ctx.lineWidth = 2.8;
            ctx.beginPath();
            ctx.arc(x, y, raio, a0, a0 + Math.PI * 0.75);
            ctx.stroke();
        }

        ctx.fillStyle = '#66ff99';
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // ---------------- API do Módulo ----------------
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
        desenharPortalEntradaPantano: desenharPortalEntradaPantano,
        lagos: function () { return lagosInfo; },
        cabanas: function () { return cabanasInfo; },
        vagalumes: function () { return vagalumes; }
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