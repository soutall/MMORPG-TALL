// ============================================================================
// mapa_cidade.js — FASE 5: "Cidade de Davahl" (Engine Gráfica 2.5D Hiper-Realista)
// Módulo isomórfico: roda no NAVEGADOR (expõe funções em window) E no SERVIDOR
// (module.exports), mantendo 100% de compatibilidade de colisão e rede.
//
//   • Cidade            : x em [59800, 63800) × y em [0, 3000).
//   • Tile = 40px → COLS=100, ROWS=75.
//   • Perspectiva 2.5D volumétrica: arquitetura medieval, paredes laterais em
//     perspectiva, telhados com beirais e cumeeiras, sombras reais projetadas,
//     calçamento de paralelepípedos procedural, iluminação volumétrica,
//     muralhas com ameias e torres de vigia, e Grande Fonte em 3 níveis.
// ============================================================================
(function (global) {
    'use strict';

    const TILE = 40;
    const CID_X0 = 59800;
    const CID_X1 = 63800;
    const CID_Y1 = 3000;
    const COLS = (CID_X1 - CID_X0) / TILE;     // 100
    const ROWS = CID_Y1 / TILE;                // 75

    const ALT_LIVRE = 0, ALT_PEQUENA = 1, ALT_MEDIA = 2, ALT_ALTA = 3;
    const TIPOS_ALT = {
        chao: ALT_LIVRE,
        grama: ALT_LIVRE,
        rua: ALT_LIVRE,
        flor: ALT_LIVRE,
        fonte: ALT_MEDIA,
        arvore: ALT_MEDIA,
        lampada: ALT_MEDIA,
        barraca: ALT_MEDIA,
        casa: ALT_ALTA,
        muro: ALT_ALTA
    };

    // Praça central
    const PRACA_CX = 50, PRACA_CY = 37;

    // Portais
    const PORTA_CIDADE_VERDE = { x: 5000, y: 1200, r: 58, alvo: { x: CID_X0 + 120, y: 1400 } };
    const PORTA_CIDADE_RETORNO = { x: CID_X0 + 120, y: 1400, r: 58, alvo: { x: 5000, y: 1200 } };
    const PORTAL_MAPAS = { x: 61824, y: 1783, r: 55 };

    // ============================================================================
    // EDIFÍCIOS VOLUMÉTRICOS 2.5D (Casas, Lojas, Oficinas e Mansões)
    // ============================================================================
    const CASAS = [
        { id: 'taverna', nome: 'Taverna do Javali Dourado', cx: 15, cy: 12, lx: 5, ly: 4, corParede: '#d5c4a1', corTelhado: '#a93226', estilo: 'enxaimel', icone: '🍺' },
        { id: 'forja', nome: 'Forja do Dragão de Aço', cx: 34, cy: 7, lx: 6, ly: 4, corParede: '#7f8c8d', corTelhado: '#4a235a', estilo: 'pedra', icone: '⚒️' },
        { id: 'alquimia', nome: 'Alquimia dos Sábios', cx: 66, cy: 8, lx: 6, ly: 4, corParede: '#bdc3c7', corTelhado: '#1f618d', estilo: 'enxaimel_azul', icone: '🧪' },
        { id: 'mansao1', nome: 'Mansão de Lorde Vane', cx: 84, cy: 14, lx: 5, ly: 4, corParede: '#f5eef8', corTelhado: '#2c3e50', estilo: 'nobre', icone: '👑' },
        { id: 'arcanos', nome: 'Torre dos Arcanos', cx: 88, cy: 34, lx: 4, ly: 5, corParede: '#d0ece7', corTelhado: '#6c3483', estilo: 'mistico', icone: '🔮' },
        { id: 'guarda', nome: 'Quartel da Guarda Real', cx: 84, cy: 56, lx: 5, ly: 4, corParede: '#95a5a6', corTelhado: '#78281f', estilo: 'militar', icone: '🛡️' },
        { id: 'estalagem', nome: 'Estalagem do Descanso', cx: 66, cy: 62, lx: 6, ly: 4, corParede: '#f9e79f', corTelhado: '#b9770e', estilo: 'enxaimel', icone: '🛏️' },
        { id: 'alfaiate', nome: 'Alfaiataria Nobre', cx: 44, cy: 66, lx: 5, ly: 4, corParede: '#fadbd8', corTelhado: '#117864', estilo: 'comercio', icone: '🧵' },
        { id: 'biblioteca', nome: 'Grande Arquivo de Davahl', cx: 22, cy: 62, lx: 6, ly: 4, corParede: '#e8daef', corTelhado: '#1b4f72', estilo: 'classico', icone: '📜' },
        { id: 'armazem', nome: 'Armazém das Caravanas', cx: 7, cy: 54, lx: 5, ly: 4, corParede: '#d7ccc8', corTelhado: '#8d6e63', estilo: 'rustico', icone: '📦' },
        { id: 'residencia1', nome: 'Residência das Flores', cx: 84, cy: 64, lx: 3, ly: 3, corParede: '#e0f2f1', corTelhado: '#e67e22', estilo: 'floral', icone: '🌸' },
        { id: 'residencia2', nome: 'Oficina do Boticário', cx: 14, cy: 30, lx: 3, ly: 3, corParede: '#fff9c4', corTelhado: '#1e8449', estilo: 'herbal', icone: '🌿' },
        { id: 'residencia3', nome: 'Joalheria das Gemas', cx: 84, cy: 30, lx: 3, ly: 3, corParede: '#ede7f6', corTelhado: '#2e4053', estilo: 'luxo', icone: '💎' },
        { id: 'residencia4', nome: 'Chalé do Rio', cx: 10, cy: 64, lx: 3, ly: 3, corParede: '#e1f5fe', corTelhado: '#ba4a00', estilo: 'pesca', icone: '🐟' }
    ];

    // ============================================================================
    // FEIRA MEDIEVAL DA PRAÇA (Barracas com Toldos Listrados e Mercadorias)
    // ============================================================================
    const BARRACAS = [
        { cx: 43, cy: 33, nome: 'Banca de Poções', corToldo1: '#8e44ad', corToldo2: '#f4d03f', icone: '🧪' },
        { cx: 57, cy: 33, nome: 'Frutas e Especiarias', corToldo1: '#c0392b', corToldo2: '#ecf0f1', icone: '🍎' },
        { cx: 43, cy: 41, nome: 'Arsenal e Escudos', corToldo1: '#2980b9', corToldo2: '#f39c12', icone: '🗡️' },
        { cx: 57, cy: 41, nome: 'Tomo e Encantos', corToldo1: '#27ae60', corToldo2: '#ecf0f1', icone: '📖' }
    ];

    // Bancos de madeira na praça
    const BANCOS = [
        { cx: 46, cy: 34 }, { cx: 54, cy: 34 },
        { cx: 46, cy: 40 }, { cx: 54, cy: 40 }
    ];

    // Parques/árvores dentro da cidade
    const ARVORES = [
        { cx: 8, cy: 8 }, { cx: 12, cy: 9 }, { cx: 10, cy: 13 },
        { cx: 90, cy: 8 }, { cx: 93, cy: 11 }, { cx: 90, cy: 14 },
        { cx: 92, cy: 60 }, { cx: 93, cy: 63 },
        { cx: 7, cy: 60 }, { cx: 10, cy: 58 },
        { cx: 48, cy: 68 }, { cx: 52, cy: 68 },
        { cx: 48, cy: 4 }, { cx: 52, cy: 4 }
    ];

    // Lâmpadas ornamentais ao longo das ruas
    const LAMPADAS = [
        { cx: 44, cy: 30 }, { cx: 56, cy: 30 }, { cx: 44, cy: 44 }, { cx: 56, cy: 44 },
        { cx: 44, cy: 10 }, { cx: 56, cy: 10 }, { cx: 44, cy: 64 }, { cx: 56, cy: 64 },
        { cx: 20, cy: 37 }, { cx: 30, cy: 37 }, { cx: 70, cy: 37 }, { cx: 80, cy: 37 }
    ];

    // Torres de vigia nos vértices das muralhas
    const TORRES = [
        { cx: 2, cy: 2 }, { cx: COLS - 3, cy: 2 },
        { cx: 2, cy: ROWS - 3 }, { cx: COLS - 3, cy: ROWS - 3 }
    ];

    let grid = null;
    let sortables = [];

    // ---------- PRNG/hash determinísticos ----------
    function mulberry32(seed) {
        return function () {
            seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
            let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    function hash2(a, b, s) {
        let n = (a * 374761393 + b * 668265263 + (s || 0)) | 0;
        n = Math.imul(n ^ (n >>> 13), 1274126177);
        return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
    }

    function marcar(c, l, tipo) {
        if (l >= 0 && l < ROWS && c >= 0 && c < COLS)
            grid[l][c] = { tipo: tipo, alt: TIPOS_ALT[tipo] };
    }

    function gerarCidade() {
        if (grid) return grid;

        grid = [];
        for (let l = 0; l < ROWS; l++) {
            grid[l] = [];
            for (let c = 0; c < COLS; c++) grid[l][c] = { tipo: 'chao', alt: ALT_LIVRE };
        }

        // 1) Muralha externa fortificada (exceto o Portão Oeste monumental)
        for (let l = 0; l < ROWS; l++) {
            for (let c = 0; c < COLS; c++) {
                if (c === 0 || c === COLS - 1 || l === 0 || l === ROWS - 1) {
                    // Portão Oeste: passagem aberta em [33..40]
                    if (c === 0 && l >= 33 && l <= 40) { marcar(c, l, 'rua'); continue; }
                    marcar(c, l, 'muro');
                }
            }
        }

        // 2) Ruas principais pavimentadas (eixo cardeal na praça) + anel
        for (let l = 0; l < ROWS; l++) {
            for (let c = 0; c < COLS; c++) {
                if (grid[l][c].tipo === 'muro') continue;
                if ((l >= 30 && l <= 44) || (c >= 42 && c <= 58)) {
                    marcar(c, l, 'rua');
                }
            }
        }
        // Anel circular em volta da praça
        for (let l = 24; l <= 50; l++) {
            for (let c = 34; c <= 66; c++) {
                if (grid[l][c].tipo === 'muro') continue;
                const d = Math.hypot(c - PRACA_CX, l - PRACA_CY);
                if (Math.abs(d - 12) < 2.5) marcar(c, l, 'rua');
            }
        }

        // 3) Casas grandes (colisão total)
        for (let k = 0; k < CASAS.length; k++) {
            const H = CASAS[k];
            for (let l = H.cy - H.ly; l < H.cy + H.ly; l++) {
                for (let c = H.cx - H.lx; c < H.cx + H.lx; c++) {
                    if (grid[l] && grid[l][c] && grid[l][c].tipo !== 'muro') marcar(c, l, 'casa');
                }
            }
        }

        // 4) Praça: calçamento nobre + fonte monumental
        for (let l = PRACA_CY - 9; l <= PRACA_CY + 9; l++) {
            for (let c = PRACA_CX - 9; c <= PRACA_CX + 9; c++) {
                if (grid[l] && grid[l][c] && grid[l][c].tipo === 'chao') marcar(c, l, 'rua');
            }
        }
        for (let l = PRACA_CY - 2; l <= PRACA_CY + 2; l++) {
            for (let c = PRACA_CX - 2; c <= PRACA_CX + 2; c++) {
                if (grid[l] && grid[l][c] && grid[l][c].tipo !== 'muro') marcar(c, l, 'fonte');
            }
        }

        // 5) Barracas de feira (colisão média)
        for (let k = 0; k < BARRACAS.length; k++) {
            const B = BARRACAS[k];
            marcar(B.cx, B.cy, 'barraca');
        }

        // 6) Árvores de parque
        for (let k = 0; k < ARVORES.length; k++) {
            const A = ARVORES[k];
            if (grid[A.cy] && grid[A.cy][A.cx] && (grid[A.cy][A.cx].tipo === 'chao' || grid[A.cy][A.cx].tipo === 'grama'))
                marcar(A.cx, A.cy, 'arvore');
        }

        // 7) Lâmpadas ornamentais
        for (let k = 0; k < LAMPADAS.length; k++) {
            const L = LAMPADAS[k];
            if (grid[L.cy] && grid[L.cy][L.cx] && grid[L.cy][L.cx].tipo === 'rua')
                marcar(L.cx, L.cy, 'lampada');
        }

        // 8) Grama e canteiros florais urbanos
        const rnd = mulberry32(20260917);
        for (let l = 0; l < ROWS; l++) {
            for (let c = 0; c < COLS; c++) {
                if (grid[l][c].tipo === 'chao') {
                    if (hash2(c, l, 5) > 0.48) marcar(c, l, 'grama');
                    else if (hash2(c, l, 9) < 0.05) marcar(c, l, 'flor');
                }
            }
        }
        // Flores ao redor da praça central
        for (let i = 0; i < 110; i++) {
            const c = PRACA_CX - 11 + Math.floor(rnd() * 23);
            const l = PRACA_CY - 11 + Math.floor(rnd() * 23);
            if (grid[l] && grid[l][c] && grid[l][c].tipo === 'grama') marcar(c, l, 'flor');
        }

        // 9) Snapshot das entidades para o pipeline de Y-Sort 2.5D
        sortables = [];
        for (let k = 0; k < CASAS.length; k++) {
            const H = CASAS[k];
            sortables.push({
                tipo: 'casa',
                id: H.id,
                nome: H.nome,
                icone: H.icone,
                corParede: H.corParede,
                corTelhado: H.corTelhado,
                estilo: H.estilo,
                x: CID_X0 + (H.cx + 0.5) * TILE,
                base: (H.cy + H.ly) * TILE,
                w: H.lx * 2 * TILE,
                h: H.ly * 2 * TILE
            });
        }
        for (let k = 0; k < BARRACAS.length; k++) {
            const B = BARRACAS[k];
            sortables.push({
                tipo: 'barraca',
                nome: B.nome,
                icone: B.icone,
                corToldo1: B.corToldo1,
                corToldo2: B.corToldo2,
                x: CID_X0 + (B.cx + 0.5) * TILE,
                base: (B.cy + 1) * TILE
            });
        }
        for (let k = 0; k < BANCOS.length; k++) {
            const Bc = BANCOS[k];
            sortables.push({
                tipo: 'banco',
                x: CID_X0 + (Bc.cx + 0.5) * TILE,
                base: (Bc.cy + 1) * TILE
            });
        }
        for (let k = 0; k < ARVORES.length; k++) {
            const A = ARVORES[k];
            sortables.push({
                tipo: 'arvore',
                x: CID_X0 + (A.cx + 0.5) * TILE,
                base: (A.cy + 1) * TILE
            });
        }
        for (let k = 0; k < LAMPADAS.length; k++) {
            const L = LAMPADAS[k];
            sortables.push({
                tipo: 'lampada',
                x: CID_X0 + (L.cx + 0.5) * TILE,
                base: (L.cy + 1) * TILE
            });
        }
        for (let k = 0; k < TORRES.length; k++) {
            const Tr = TORRES[k];
            sortables.push({
                tipo: 'torre',
                x: CID_X0 + (Tr.cx + 0.5) * TILE,
                base: (Tr.cy + 2) * TILE
            });
        }
        // Fonte monumental no centro da praça
        sortables.push({
            tipo: 'fonte',
            x: CID_X0 + (PRACA_CX + 0.5) * TILE,
            base: (PRACA_CY + 3) * TILE
        });

        return grid;
    }

    // ---------- Colisão / Consulta Isomórfica ----------
    function isCidade(x) { return x >= CID_X0 && x < CID_X1; }

    function alvoEmCidade(x, y) {
        if (!isCidade(x, y)) return null;
        const c = Math.floor((x - CID_X0) / TILE);
        const l = Math.floor(y / TILE);
        if (c < 0 || c >= COLS || l < 0 || l >= ROWS) return null;
        return grid[l][c];
    }

    function colideCidade(x, y, raio) {
        if (!grid) gerarCidade();
        if (!isCidade(x, y)) return false;
        const r = (typeof raio === 'number') ? raio : 8;
        const amostras = [[0, 0], [r, 0], [-r, 0], [0, r], [0, -r]];
        for (let i = 0; i < amostras.length; i++) {
            const pc = Math.floor((x + amostras[i][0] - CID_X0) / TILE);
            const pl = Math.floor((y + amostras[i][1]) / TILE);
            if (pc < 0 || pc >= COLS || pl < 0 || pl >= ROWS) return true;
            if (grid[pl][pc].alt >= ALT_PEQUENA) return true;
        }
        return false;
    }

    function colideProjetilCidade(x, y) {
        if (!grid) gerarCidade();
        if (!isCidade(x, y)) return false;
        const c = Math.floor((x - CID_X0) / TILE);
        const l = Math.floor(y / TILE);
        if (c < 0 || c >= COLS || l < 0 || l >= ROWS) return true;
        return grid[l][c].alt >= ALT_MEDIA;
    }

    function colideMapaAtivo(x, y, raio) {
        const m = global.currentMap;
        if (m === 'cidade') return colideCidade(x, y, raio);
        if (m === 'caverna') return (global.colideCaverna ? global.colideCaverna(x, y, raio) : false);
        if (m === 'pantano') return (global.colidePantano ? global.colidePantano(x, y, raio) : false);
        if (m === 'desert') return (global.colideDeserto ? global.colideDeserto(x, y, raio) : false);
        return false;
    }

    // ---------- Transição ----------
    let transicaoAtiva = false;
    let overlayEl = null;

    function obterOverlay() {
        if (overlayEl) return overlayEl;
        overlayEl = document.createElement('div');
        overlayEl.id = 'overlay-mapa-cidade';
        overlayEl.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;background:#0a0e12;z-index:99999;opacity:0;pointer-events:none;transition:opacity .35s ease;';
        document.body.appendChild(overlayEl);
        return overlayEl;
    }

    function infoPortalCidade(x, y) {
        if (x >= CID_X0) {
            if (Math.hypot(x - PORTA_CIDADE_RETORNO.x, y - PORTA_CIDADE_RETORNO.y) < PORTA_CIDADE_RETORNO.r) {
                return { via: 'portal', mapa: 'green', alvo: PORTA_CIDADE_RETORNO.alvo };
            }
            return null;
        }
        if (x < (global.LARGURA_VERDE || 18000)) {
            if (Math.hypot(x - PORTA_CIDADE_VERDE.x, y - PORTA_CIDADE_VERDE.y) < PORTA_CIDADE_VERDE.r) {
                return { via: 'portal', mapa: 'cidade', alvo: PORTA_CIDADE_VERDE.alvo };
            }
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
        const LW = global.LARGURA_VERDE || 18000, LD = global.LARGURA_DESERTO || 50000, LP = global.LARGURA_PANTANO || 58000, LC = global.LARGURA_CIDADE || 59800;
        if (x >= LC) return 'cidade';
        if (x >= LP) return 'caverna';
        if (x >= LD) return 'pantano';
        if (x >= LW) return 'desert';
        return 'green';
    }

    let cidadeChainAnterior = null;

    function onUpdatePosicao(x, y) {
        if (transicaoAtiva || global.estaMorto) return;
        let info = null;
        if (x >= CID_X0) {
            info = infoPortalCidade(x, y);
        }
        if (!info && x < (global.LARGURA_VERDE || 18000)) {
            info = infoPortalCidade(x, y);
        }
        if (!info && cidadeChainAnterior && typeof cidadeChainAnterior.onUpdatePosicao === 'function') {
            cidadeChainAnterior.onUpdatePosicao(x, y);
            return;
        }
        if (!info) return;
        transicaoAtiva = true;
        switchMapaFade(function () {
            global.meuX = info.alvo.x;
            global.meuY = info.alvo.y;
            global.currentMap = _determinarMapa(info.alvo.x);
            transicaoAtiva = false;
        });
    }

    function depositarPosicaoSegura(x0, y0) {
        if (!colideCidade(x0, y0, 10)) return { x: x0, y: y0 };
        for (let r = 1; r <= 4; r++) {
            for (let a = 0; a < 8; a++) {
                const ang = (a / 8) * Math.PI * 2;
                const x = x0 + Math.cos(ang) * r * TILE;
                const y = y0 + Math.sin(ang) * r * TILE;
                if (x < CID_X0) x = CID_X0 + 20;
                if (!colideCidade(x, y, 10)) return { x: x, y: y };
            }
        }
        return { x: PORTA_CIDADE_RETORNO.x, y: PORTA_CIDADE_RETORNO.y };
    }

    // ============================================================================
    // ENGINE GRÁFICA 2.5D: CENÁRIO, CALÇAMENTO E SOMBRAS DIRECIONAIS
    // ============================================================================

    // Vetor de iluminação solar: Sol vindo de Noroeste (-50°) gerando sombras para Sudeste
    const SUN_DX = 28;
    const SUN_DY = 34;

    function desenharCenarioCidade(t) {
        const ctx = global.ctx;
        if (!ctx) return;

        let camX = global.camX || 0;
        let camY = global.camY || 0;
        let cw = (global.canvas && global.canvas.width) || (global.innerWidth || 800);
        let ch = (global.canvas && global.canvas.height) || (global.innerHeight || 600);
        cw = cw / (global.ZOOM_CAMERA || 1);
        ch = ch / (global.ZOOM_CAMERA || 1);

        if (!grid) gerarCidade();

        let c0 = Math.max(0, Math.floor((camX - CID_X0 - 240) / TILE));
        let c1 = Math.min(COLS - 1, Math.ceil((camX - CID_X0 + cw + 240) / TILE));
        let l0 = Math.max(0, Math.floor((camY - 240) / TILE));
        let l1 = Math.min(ROWS - 1, Math.ceil((camY + ch + 240) / TILE));

        // 1. Fundo terroso escuro de fundação
        ctx.fillStyle = '#1c1a17';
        ctx.fillRect(camX - 20, camY - 20, cw + 40, ch + 40);

        // 2. Calçamento procedural hiper-realista e relevo de solo
        for (let l = l0; l <= l1; l++) {
            for (let c = c0; c <= c1; c++) {
                const cel = grid[l][c];
                const x = CID_X0 + c * TILE;
                const y = l * TILE;

                if (cel.tipo === 'casa') continue; // Desenha-se depois no Y-Sort

                if (cel.tipo === 'rua') {
                    desenharParalelepipedos(ctx, x, y, c, l);
                } else if (cel.tipo === 'grama' || cel.tipo === 'flor') {
                    desenharJardimUrbano(ctx, x, y, c, l, cel.tipo === 'flor');
                } else if (cel.tipo === 'muro') {
                    desenharChaoMuralha(ctx, x, y, c, l);
                } else {
                    // Chão de terra batida com cascalho
                    ctx.fillStyle = '#2f2b26';
                    ctx.fillRect(x, y, TILE + 1, TILE + 1);
                    const hT = hash2(c, l, 33);
                    if (hT > 0.6) {
                        ctx.fillStyle = 'rgba(75, 68, 58, 0.4)';
                        ctx.beginPath();
                        ctx.ellipse(x + 18, y + 20, 10, 5, 0.2, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            }
        }

        // 3. Mosaico Rúnico da Praça Central (ao redor da Fonte)
        desenharMosaicoPraca(ctx, t, camX, camY, cw, ch);

        // 4. Muralhas Fortificadas com Ameias e Seteiras (Fundo/Chão e Passarelas)
        desenharMuralhasElevadas(ctx, c0, c1, l0, l1);

        // 5. ENGINE DE SOMBRAS REAIS PROJETADAS (Sol Noroeste)
        desenharSombrasProjetadas(ctx, camX, camY, cw, ch);

        // 6. Poças de luz quente dos postes sobre o calçamento
        desenharLuzesNoSolo(ctx, t, camX, camY, cw, ch);

        // 7. Portal de Viagem Interdimensional
        desenharPortalViagem(ctx, t, camX, camY, cw, ch);
    }

    // ---------- Cache de textura de calçamento (gerado uma vez) ----------
    let _cobbleCv = null;
    let _cobblePat = null;

    function _gerarCobbleCv() {
        if (_cobbleCv) return _cobbleCv;
        const sz = 120; // tile múltiplo para repetição perfeita
        _cobbleCv = document.createElement('canvas');
        _cobbleCv.width = sz; _cobbleCv.height = sz;
        const c = _cobbleCv.getContext('2d');

        // Argamassa de fundo
        c.fillStyle = '#16140f';
        c.fillRect(0, 0, sz, sz);

        // Layout de pedras (padrão amarração inglesa)
        const rows = [
            // [x, y, w, h, colorVariant]
            [1,1,36,22,0],[39,1,38,22,1],[79,1,38,22,2],
            [1,25,28,22,3],[31,25,38,22,0],[71,25,28,22,4],[101,25,17,22,1],
            [1,49,38,22,2],[41,49,36,22,3],[79,49,38,22,0],
            [1,73,28,22,4],[31,73,38,22,2],[71,73,48,22,1],
            [1,97,36,22,0],[39,97,38,22,3],[79,97,38,22,4]
        ];
        const paleta = ['#6a5f52','#786c5e','#5c5248','#857769','#6d6255'];
        const palClara = ['#8a7f72','#9a8e80','#7a6e64','#a59785','#8d806e'];
        const palEscura = ['#4e4539','#564c40','#403c34','#63574a','#524739'];

        rows.forEach(function(r) {
            const [px,py,pw,ph,v] = r;
            if (px+pw > sz+2) return;
            // Gradiente de iluminação (luz vindo de cima-esquerda)
            const g = c.createLinearGradient(px, py, px+pw*0.7, py+ph);
            g.addColorStop(0, palClara[v]);
            g.addColorStop(0.35, paleta[v]);
            g.addColorStop(1, palEscura[v]);
            c.fillStyle = g;
            c.beginPath();
            c.roundRect ? c.roundRect(px,py,pw,ph,3) : c.rect(px,py,pw,ph);
            c.fill();

            // Highlight diagonal (reflexo solar)
            c.fillStyle = 'rgba(255,245,200,0.20)';
            c.fillRect(px+1, py+1, pw-2, 2);
            c.fillRect(px+1, py+1, 2, ph-2);

            // Sombra borda direita/baixo
            c.fillStyle = 'rgba(0,0,0,0.50)';
            c.fillRect(px+pw-2, py+2, 2, ph-2);
            c.fillRect(px+2, py+ph-2, pw-2, 2);

            // Poros e manchas de umidade aleatórias mas determinísticas
            const hv = (px * 37 + py * 17 + v * 7) % 100;
            if (hv < 30) {
                c.fillStyle = 'rgba(0,0,0,0.13)';
                c.beginPath();
                c.ellipse(px+pw*0.35, py+ph*0.65, pw*0.12, ph*0.14, 0.5, 0, Math.PI*2);
                c.fill();
            }
            if (hv > 70) {
                // Musgo sutil
                c.fillStyle = 'rgba(40,80,30,0.18)';
                c.fillRect(px+1, py+ph-4, Math.floor(pw*0.4), 3);
            }
        });

        return _cobbleCv;
    }

    function desenharParalelepipedos(ctx, x, y, c, l) {
        // Garante que o canvas de textura existe
        const tcv = _gerarCobbleCv();

        // Padrão de repetição
        if (!_cobblePat) {
            _cobblePat = ctx.createPattern(tcv, 'repeat');
        }

        // Offset de repetição baseado na posição do tile para criar variação
        const offX = (c * TILE) % tcv.width;
        const offY = (l * TILE) % tcv.height;

        ctx.save();
        // Translação para offset correto do padrão
        const mat = new DOMMatrix().translate(x - offX, y - offY);
        _cobblePat.setTransform(mat);
        ctx.fillStyle = _cobblePat;
        ctx.fillRect(x, y, TILE + 1, TILE + 1);

        // Overlay escuro nas bordas do tile (profundidade entre tiles)
        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        ctx.fillRect(x, y, TILE + 1, 1);
        ctx.fillRect(x, y, 1, TILE + 1);

        // Variação de luminosidade por tile (simula iluminação ambiente desigual)
        const hTile = hash2(c, l, 91);
        if (hTile < 0.15) {
            // Tile ligeiramente mais escuro (sombra de canto ou poça)
            ctx.fillStyle = 'rgba(0,0,0,0.18)';
            ctx.fillRect(x, y, TILE + 1, TILE + 1);
        } else if (hTile > 0.88) {
            // Tile ligeiramente mais claro (reflexo solar direto)
            ctx.fillStyle = 'rgba(255,240,180,0.06)';
            ctx.fillRect(x, y, TILE + 1, TILE + 1);
        }
        ctx.restore();
    }


    // ---------- Gramados e Jardins Urbanos — Alta Fidelidade ----------
    function desenharJardimUrbano(ctx, x, y, c, l, temFlores) {
        // Base de solo fértil com gradiente
        const gSolo = ctx.createLinearGradient(x, y, x + TILE, y + TILE);
        gSolo.addColorStop(0, '#1b3d14');
        gSolo.addColorStop(1, '#112a0d');
        ctx.fillStyle = gSolo;
        ctx.fillRect(x, y, TILE + 1, TILE + 1);

        // Camada de grama base (cor variada por hash)
        const hBase = hash2(c, l, 5);
        const corGrama = hBase > 0.5 ? '#2d6a24' : '#256520';
        ctx.fillStyle = corGrama;
        ctx.fillRect(x + 1, y + 1, TILE - 1, TILE - 1);

        // Manchas de cores diferentes de grama
        const h2 = hash2(c, l, 88);
        ctx.fillStyle = h2 > 0.6 ? 'rgba(60,130,40,0.40)' : 'rgba(30,100,20,0.30)';
        ctx.beginPath();
        ctx.ellipse(x + TILE * 0.3, y + TILE * 0.4, TILE * 0.25, TILE * 0.18, h2 * 2, 0, Math.PI * 2);
        ctx.fill();

        // Musgo nas sombras (canto inferior direito)
        ctx.fillStyle = 'rgba(30,70,20,0.45)';
        ctx.beginPath();
        ctx.ellipse(x + TILE * 0.75, y + TILE * 0.78, TILE * 0.18, TILE * 0.12, 0.3, 0, Math.PI * 2);
        ctx.fill();

        // Tufos de grama individuais (linhas verticais)
        const nTufos = 5 + Math.floor(hash2(c, l, 33) * 4);
        ctx.strokeStyle = '#3a8a2e';
        ctx.lineWidth = 1;
        for (let i = 0; i < nTufos; i++) {
            const tx = x + 4 + Math.floor(hash2(c + i, l, 42) * (TILE - 8));
            const ty = y + 4 + Math.floor(hash2(c, l + i, 55) * (TILE - 8));
            ctx.beginPath();
            ctx.moveTo(tx, ty + 5);
            ctx.quadraticCurveTo(tx + (hash2(c+i,l,66)*4-2), ty, tx + (hash2(c,l+i,77)*3-1.5), ty - 4);
            ctx.stroke();
        }

        // Mureta de contenção em pedra caso faça divisa com rua
        const vizN = l > 0   && grid[l-1][c].tipo === 'rua';
        const vizS = l < ROWS-1 && grid[l+1][c].tipo === 'rua';
        const vizW = c > 0   && grid[l][c-1].tipo === 'rua';
        const vizE = c < COLS-1 && grid[l][c+1].tipo === 'rua';

        if (vizN) {
            const gM = ctx.createLinearGradient(x, y, x, y+5);
            gM.addColorStop(0,'#7a7060'); gM.addColorStop(1,'#4a4338');
            ctx.fillStyle = gM; ctx.fillRect(x, y, TILE+1, 5);
        }
        if (vizS) {
            const gM = ctx.createLinearGradient(x, y+TILE-4, x, y+TILE);
            gM.addColorStop(0,'#4a4338'); gM.addColorStop(1,'#38332a');
            ctx.fillStyle = gM; ctx.fillRect(x, y+TILE-4, TILE+1, 4);
        }
        if (vizW) {
            const gM = ctx.createLinearGradient(x, y, x+5, y);
            gM.addColorStop(0,'#7a7060'); gM.addColorStop(1,'#4a4338');
            ctx.fillStyle = gM; ctx.fillRect(x, y, 5, TILE+1);
        }
        if (vizE) {
            const gM = ctx.createLinearGradient(x+TILE-4, y, x+TILE, y);
            gM.addColorStop(0,'#4a4338'); gM.addColorStop(1,'#38332a');
            ctx.fillStyle = gM; ctx.fillRect(x+TILE-4, y, 4, TILE+1);
        }

        if (temFlores) {
            const hFlor = hash2(c, l, 44);
            // Paleta rica de flores
            const flores = [
                { cor: '#f44336', centro: '#ffeb3b' }, // Rosa vermelha
                { cor: '#e91e63', centro: '#fff9c4' }, // Magenta
                { cor: '#fbc02d', centro: '#f57f17' }, // Amarela
                { cor: '#8e44ad', centro: '#e1bee7' }, // Lavanda
                { cor: '#ff7043', centro: '#fff3e0' }  // Laranja
            ];
            const nFlores = 2 + Math.floor(hFlor * 3);
            for (let fi = 0; fi < nFlores; fi++) {
                const fType = flores[Math.floor(hash2(c+fi, l, 100) * flores.length)];
                const fx2 = x + 6 + Math.floor(hash2(c+fi, l, 11) * (TILE - 12));
                const fy2 = y + 6 + Math.floor(hash2(c, l+fi, 22) * (TILE - 12));
                const r = 2.5 + hash2(c+fi, l+fi, 33);
                // Haste
                ctx.strokeStyle = '#2e7d32'; ctx.lineWidth = 1.2;
                ctx.beginPath(); ctx.moveTo(fx2, fy2+r+3); ctx.lineTo(fx2, fy2+r+8); ctx.stroke();
                // Pétalas (4 círculos ao redor)
                ctx.fillStyle = fType.cor;
                for (let p = 0; p < 4; p++) {
                    const pa = p * Math.PI / 2;
                    ctx.beginPath();
                    ctx.arc(fx2 + Math.cos(pa) * r, fy2 + Math.sin(pa) * r, r, 0, Math.PI * 2);
                    ctx.fill();
                }
                // Centro da flor
                ctx.fillStyle = fType.centro;
                ctx.beginPath(); ctx.arc(fx2, fy2, r * 0.55, 0, Math.PI * 2); ctx.fill();
            }
        }
    }


    // ---------- Mosaico Rúnico Nobre da Praça Central ----------
    function desenharMosaicoPraca(ctx, t, camX, camY, cw, ch) {
        const mx = CID_X0 + (PRACA_CX + 0.5) * TILE;
        const my = (PRACA_CY + 0.5) * TILE;
        const raioMax = 280;
        if (mx + raioMax < camX || mx - raioMax > camX + cw || my + raioMax < camY || my - raioMax > camY + ch) return;

        ctx.save();
        // Anel externo em mármore polido escuro
        ctx.strokeStyle = '#37474f';
        ctx.lineWidth = 14;
        ctx.beginPath();
        ctx.arc(mx, my, 210, 0, Math.PI * 2);
        ctx.stroke();

        // Anel de ouro velho com inscrições
        ctx.strokeStyle = '#c5a059';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(mx, my, 216, 0, Math.PI * 2);
        ctx.stroke();

        // Rosa dos ventos geométrica em mármore claro e ardósia
        ctx.fillStyle = 'rgba(215, 204, 185, 0.25)';
        for (let i = 0; i < 8; i++) {
            const ang = (i / 8) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(mx, my);
            ctx.lineTo(mx + Math.cos(ang - 0.18) * 160, my + Math.sin(ang - 0.18) * 160);
            ctx.lineTo(mx + Math.cos(ang) * 200, my + Math.sin(ang) * 200);
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();
    }

    // ---------- Chão das Muralhas Fortificadas ----------
    function desenharChaoMuralha(ctx, x, y, c, l) {
        ctx.fillStyle = '#3c372f';
        ctx.fillRect(x, y, TILE + 1, TILE + 1);
        // Pedras de granito aparelhadas
        ctx.fillStyle = '#544d42';
        ctx.fillRect(x + 2, y + 2, TILE - 3, TILE - 3);
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.fillRect(x + 2, y + 2, TILE - 3, 2);
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(x + 2, y + TILE - 3, TILE - 3, 2);
    }

    // ---------- Muralhas Elevadas e Ameias em 2.5D ----------
    function desenharMuralhasElevadas(ctx, c0, c1, l0, l1) {
        ctx.save();
        for (let l = l0; l <= l1; l++) {
            for (let c = c0; c <= c1; c++) {
                if (!grid[l] || grid[l][c].tipo !== 'muro') continue;
                const x = CID_X0 + c * TILE;
                const y = l * TILE;

                // Elevação de parede 2.5D
                const altParede = 16;
                // Sombra de topo
                ctx.fillStyle = '#26221c';
                ctx.fillRect(x, y + TILE - altParede, TILE + 1, altParede);

                // Face frontal da muralha
                ctx.fillStyle = '#5e564a';
                ctx.fillRect(x, y - 6, TILE + 1, TILE - 6);

                // Ameia dentada (crenels)
                if (c % 2 === 0) {
                    ctx.fillStyle = '#6f6658';
                    ctx.fillRect(x + 4, y - 14, TILE - 8, 8);
                    ctx.fillStyle = '#8a7f6e';
                    ctx.fillRect(x + 4, y - 14, TILE - 8, 2);
                }
            }
        }
        ctx.restore();
    }

    // ============================================================================
    // SISTEMA DE SOMBRAS REAIS PROJETADAS (Direcional Noroeste para Sudeste)
    // ============================================================================
    function desenharSombrasProjetadas(ctx, camX, camY, cw, ch) {
        ctx.save();

        // 1. Sombras volumétricas das casas e lojas
        for (let k = 0; k < CASAS.length; k++) {
            const H = CASAS[k];
            const sx = CID_X0 + (H.cx + 0.5) * TILE;
            const w = H.lx * 2 * TILE;
            const h = H.ly * 2 * TILE;
            const ground = (H.cy + H.ly) * TILE;
            const x0 = sx - w / 2;

            if (sx + w + 120 < camX || sx - w - 120 > camX + cw || ground + 120 < camY || ground - h - 120 > camY + ch) continue;

            const projX = SUN_DX * (h / 80 + 0.4);
            const projY = SUN_DY * (h / 75 + 0.3);

            // Polígono de sombra projetada realista
            const gradSombra = ctx.createLinearGradient(sx, ground, sx + projX, ground + projY);
            gradSombra.addColorStop(0, 'rgba(10, 14, 20, 0.44)');
            gradSombra.addColorStop(0.65, 'rgba(12, 16, 24, 0.24)');
            gradSombra.addColorStop(1, 'rgba(15, 20, 28, 0.0)');

            ctx.fillStyle = gradSombra;
            ctx.beginPath();
            ctx.moveTo(x0, ground);
            ctx.lineTo(x0 + w, ground);
            ctx.lineTo(x0 + w + projX * 0.9, ground + projY * 0.5);
            ctx.lineTo(sx + projX * 1.1, ground + projY * 1.15); // Sombra do cume do telhado
            ctx.lineTo(x0 + projX * 0.85, ground + projY * 0.7);
            ctx.closePath();
            ctx.fill();

            // Oclusão de Ambiente (AO) na linha de contato do chão
            ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
            ctx.fillRect(x0 - 4, ground - 3, w + 8, 5);
        }

        // 2. Sombras das árvores urbanas
        for (let k = 0; k < ARVORES.length; k++) {
            const A = ARVORES[k];
            const ax = CID_X0 + (A.cx + 0.5) * TILE;
            const ay = (A.cy + 1) * TILE;
            if (ax < camX - 60 || ax > camX + cw + 60 || ay < camY - 60 || ay > camY + ch + 60) continue;

            ctx.fillStyle = 'rgba(8, 16, 12, 0.36)';
            ctx.beginPath();
            ctx.ellipse(ax + 14, ay + 12, 34, 16, 0.25, 0, Math.PI * 2);
            ctx.fill();
        }

        // 3. Sombras da Grande Fonte
        const fx = CID_X0 + (PRACA_CX + 0.5) * TILE;
        const fy = (PRACA_CY + 3) * TILE;
        ctx.fillStyle = 'rgba(6, 14, 20, 0.38)';
        ctx.beginPath();
        ctx.ellipse(fx + 22, fy + 16, 75, 26, 0.18, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    // ---------- Poças de Luz Volumétricas no Calçamento ----------
    function desenharLuzesNoSolo(ctx, t, camX, camY, cw, ch) {
        for (let k = 0; k < LAMPADAS.length; k++) {
            const L = LAMPADAS[k];
            const lx = CID_X0 + (L.cx + 0.5) * TILE;
            const ly = (L.cy + 1) * TILE;
            if (lx < camX - 100 || lx > camX + cw + 100 || ly < camY - 100 || ly > camY + ch + 100) continue;

            const pulso = 0.85 + Math.sin(t * 2.2 + k) * 0.12;
            const raioLuz = 68 * pulso;

            const gradLuz = ctx.createRadialGradient(lx, ly, 4, lx, ly, raioLuz);
            gradLuz.addColorStop(0, 'rgba(255, 220, 110, 0.38)');
            gradLuz.addColorStop(0.45, 'rgba(243, 156, 18, 0.18)');
            gradLuz.addColorStop(1, 'rgba(243, 156, 18, 0.0)');

            ctx.save();
            ctx.fillStyle = gradLuz;
            ctx.beginPath();
            ctx.ellipse(lx, ly, raioLuz, raioLuz * 0.55, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    // ---------- Portal de Viagem Interdimensional ----------
    function desenharPortalViagem(ctx, t, camX, camY, cw, ch) {
        const px = PORTAL_MAPAS.x, py = PORTAL_MAPAS.y, r = PORTAL_MAPAS.r;
        if (px + r + 50 < camX || px - r - 50 > camX + cw || py + r + 50 < camY || py - r - 50 > camY + ch) return;

        const pulsar = 1 + Math.sin(t * 3.2) * 0.14;
        const R = r * pulsar + 6;

        ctx.save();
        // Sombra / vórtice no solo
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.beginPath();
        ctx.ellipse(px, py + 12, R * 1.15, R * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();

        // Anel arcano exterior com runas
        ctx.strokeStyle = '#00e5ff';
        ctx.lineWidth = 3.5;
        ctx.shadowColor = '#00e5ff';
        ctx.shadowBlur = 22;
        ctx.beginPath();
        ctx.arc(px, py, R, 0, Math.PI * 2);
        ctx.stroke();

        // Núcleo estrelar profundo
        const gradCore = ctx.createRadialGradient(px, py, 2, px, py, R);
        gradCore.addColorStop(0, '#e0f7fa');
        gradCore.addColorStop(0.35, '#00b0ff');
        gradCore.addColorStop(0.75, '#1565c0');
        gradCore.addColorStop(1, '#050c18');
        ctx.fillStyle = gradCore;
        ctx.beginPath();
        ctx.arc(px, py, R - 3, 0, Math.PI * 2);
        ctx.fill();

        // Espirais arcanas em rotação
        ctx.lineWidth = 2.5;
        for (let i = 0; i < 4; i++) {
            const rot = t * 2.2 + (i * Math.PI) / 2;
            ctx.strokeStyle = (i % 2 === 0) ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 229, 255, 0.75)';
            ctx.beginPath();
            ctx.arc(px, py, (R * 0.75) - i * 6, rot, rot + 1.2);
            ctx.stroke();
        }

        // Rótulo monumental
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#00e5ff';
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 13px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('PORTAL DE VIAGEM', px, py + R + 22);
        ctx.fillStyle = '#80d8ff';
        ctx.font = '11px Arial';
        ctx.fillText('Davahl • Santuário', px, py + R + 36);

        ctx.restore();
    }

    function tocarPortalViagem(mx, my) {
        if (mx === undefined || my === undefined) return false;
        return Math.hypot(mx - PORTAL_MAPAS.x, my - PORTAL_MAPAS.y) <= PORTAL_MAPAS.r + 14;
    }

    // ============================================================================
    // PIPELINE DE Y-SORT 2.5D: EDIFÍCIOS, FONTES, POSTES, ÁRVORES E TORRES
    // ============================================================================
    function coletarCidadeSortables(t, arr) {
        if (!grid) gerarCidade();
        const camX = global.camX || 0;
        const camY = global.camY || 0;
        const cw = (global.canvas && global.canvas.width) ? (global.canvas.width / (global.ZOOM_CAMERA || 1)) : 900;
        const ch = (global.canvas && global.canvas.height) ? (global.canvas.height / (global.ZOOM_CAMERA || 1)) : 600;

        for (let i = 0; i < sortables.length; i++) {
            const s = sortables[i];
            if (s.x < camX - 350 || s.x > camX + cw + 350 || s.base < camY - 450 || s.base > camY + ch + 80) continue;

            arr.push({
                y: s.base,
                draw: (function (spr, tm) {
                    return function () {
                        const ctx = global.ctx;
                        if (!ctx) return;
                        if (spr.tipo === 'casa') desenharCasa(ctx, spr, tm);
                        else if (spr.tipo === 'barraca') desenharBarraca(ctx, spr, tm);
                        else if (spr.tipo === 'fonte') desenharFonte(ctx, spr, tm);
                        else if (spr.tipo === 'lampada') desenharLampada(ctx, spr, tm);
                        else if (spr.tipo === 'torre') desenharTorreVigia(ctx, spr, tm);
                        else if (spr.tipo === 'banco') desenharBanco(ctx, spr, tm);
                        else desenharArvoreCidade(ctx, spr, tm);
                    };
                })(s, t)
            });
        }
    }

    // ============================================================================
    // ARQUITETURA VOLUMÉTRICA 2.5D: CASAS HIPER-DETALHADAS
    // ============================================================================
    function desenharCasa(ctx, s, t) {
        const w = s.w, h = s.h;
        const ground = s.base;
        const yTop = ground - h;
        const x = s.x - w / 2;
        const depth = 18; // Profundidade volumétrica aumentada

        ctx.save();

        // === 0. Sombra projetada no solo (AO Contact Shadow) ===
        const grad0 = ctx.createLinearGradient(x, ground, x + w + depth * 0.8, ground + SUN_DY * 1.4);
        grad0.addColorStop(0, 'rgba(0,0,0,0.42)');
        grad0.addColorStop(0.5, 'rgba(0,0,0,0.20)');
        grad0.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad0;
        ctx.beginPath();
        ctx.moveTo(x, ground);
        ctx.lineTo(x + w, ground);
        ctx.lineTo(x + w + SUN_DX * 1.6, ground + SUN_DY * 1.8);
        ctx.lineTo(x + SUN_DX * 0.8, ground + SUN_DY * 1.8);
        ctx.closePath();
        ctx.fill();

        // === 1. Parede Lateral em Perspectiva 2.5D (sombra forte) ===
        const gradLat = ctx.createLinearGradient(x + w, yTop, x + w + depth, yTop - depth * 0.5);
        gradLat.addColorStop(0, '#2a2318');
        gradLat.addColorStop(1, '#1a170f');
        ctx.fillStyle = gradLat;
        ctx.beginPath();
        ctx.moveTo(x + w, yTop);
        ctx.lineTo(x + w + depth, yTop - depth * 0.65);
        ctx.lineTo(x + w + depth, ground - depth * 0.65);
        ctx.lineTo(x + w, ground);
        ctx.closePath();
        ctx.fill();

        // === 2. Fachada Frontal com gradiente realista ===
        const corBase = s.corParede || '#d5c4a1';
        const r0 = parseInt(corBase.slice(1,3),16);
        const g0 = parseInt(corBase.slice(3,5),16);
        const b0 = parseInt(corBase.slice(5,7),16);
        const corTop = 'rgb('+Math.min(255,r0+25)+','+Math.min(255,g0+22)+','+Math.min(255,b0+15)+')';
        const corBot = 'rgb('+Math.max(0,r0-30)+','+Math.max(0,g0-28)+','+Math.max(0,b0-22)+')';

        const gradFac = ctx.createLinearGradient(x, yTop, x, ground);
        gradFac.addColorStop(0, corTop);
        gradFac.addColorStop(0.55, corBase);
        gradFac.addColorStop(1, corBot);
        ctx.fillStyle = gradFac;
        ctx.fillRect(x, yTop, w, h);

        // === Borda de luz lateral esquerda (reflexo solar indireto) ===
        const gradBordaL = ctx.createLinearGradient(x, yTop, x + 8, yTop);
        gradBordaL.addColorStop(0, 'rgba(255,248,210,0.22)');
        gradBordaL.addColorStop(1, 'rgba(255,248,210,0)');
        ctx.fillStyle = gradBordaL;
        ctx.fillRect(x, yTop, 10, h);

        // === AO nas bordas (sombra de contato) ===
        const gradAO = ctx.createLinearGradient(x + w - 16, yTop, x + w, yTop);
        gradAO.addColorStop(0, 'rgba(0,0,0,0)');
        gradAO.addColorStop(1, 'rgba(0,0,0,0.32)');
        ctx.fillStyle = gradAO;
        ctx.fillRect(x + w - 16, yTop, 16, h);

        // === 3. Vigamento enxaimel ou cantaria ===
        if (s.estilo.indexOf('enxaimel') !== -1) {
            ctx.fillStyle = '#2c1e14';
            ctx.fillRect(x, yTop, 5, h);
            ctx.fillRect(x + w - 5, yTop, 5, h);
            ctx.fillRect(x + w * 0.5 - 2.5, yTop, 5, h);
            ctx.fillRect(x, yTop + h * 0.5 - 2.5, w, 5);
            ctx.fillRect(x, yTop + 2, w, 5);
            ctx.strokeStyle = '#2c1e14'; ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(x+5, yTop+5); ctx.lineTo(x+w*0.5-2.5, yTop+h*0.5-2.5);
            ctx.moveTo(x+w*0.5-2.5, yTop+5); ctx.lineTo(x+5, yTop+h*0.5-2.5);
            ctx.moveTo(x+w*0.5+2.5, yTop+5); ctx.lineTo(x+w-5, yTop+h*0.5-2.5);
            ctx.moveTo(x+w-5, yTop+5); ctx.lineTo(x+w*0.5+2.5, yTop+h*0.5-2.5);
            ctx.stroke();
        } else {
            // Juntas de cantaria horizontais
            ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = 1.2;
            const nBlocos = Math.floor(h / 16);
            for (let i = 1; i < nBlocos; i++) {
                const by = yTop + i * 16;
                ctx.beginPath(); ctx.moveTo(x, by); ctx.lineTo(x+w, by); ctx.stroke();
                // Juntas verticais alternadas
                const off = (i % 2 === 0) ? w * 0.25 : w * 0.5;
                ctx.beginPath(); ctx.moveTo(x+off, by); ctx.lineTo(x+off, by+16); ctx.stroke();
            }
        }

        // === 4. Rodapé de granito ===
        const gradRod = ctx.createLinearGradient(x, ground-16, x, ground);
        gradRod.addColorStop(0,'#5a5040'); gradRod.addColorStop(1,'#3a322a');
        ctx.fillStyle = gradRod;
        ctx.fillRect(x, ground - 16, w, 16);
        ctx.fillStyle = 'rgba(255,255,255,0.14)';
        ctx.fillRect(x, ground - 16, w, 1.5);

        // === 5. Porta Principal em Arco Gótico ===
        const portW = 34, portH = 58;
        const portX = s.x - portW / 2;
        const portY = ground - portH;
        // Moldura de pedra escura
        ctx.fillStyle = '#3e352a';
        ctx.beginPath();
        ctx.arc(s.x, portY + portW * 0.52, portW * 0.52 + 5, Math.PI, 0);
        ctx.lineTo(portX + portW + 5, ground);
        ctx.lineTo(portX - 5, ground);
        ctx.closePath(); ctx.fill();
        // Folha de madeira com gradiente
        const gradPorta = ctx.createLinearGradient(portX, portY, portX+portW, portY+portH);
        gradPorta.addColorStop(0,'#5a3520'); gradPorta.addColorStop(1,'#2d1a0c');
        ctx.fillStyle = gradPorta;
        ctx.beginPath();
        ctx.arc(s.x, portY + portW * 0.52, portW * 0.52, Math.PI, 0);
        ctx.lineTo(portX + portW, ground);
        ctx.lineTo(portX, ground);
        ctx.closePath(); ctx.fill();
        // Tábuas verticais
        ctx.strokeStyle = 'rgba(0,0,0,0.30)'; ctx.lineWidth = 1.5;
        for (let tb = 1; tb < 3; tb++) {
            const tx2 = portX + (tb / 3) * portW;
            ctx.beginPath(); ctx.moveTo(tx2, portY+portH*0.15); ctx.lineTo(tx2, ground); ctx.stroke();
        }
        // Ferragem e maçaneta
        ctx.fillStyle = '#17202a';
        ctx.fillRect(portX+3, portY+16, portW-6, 3);
        ctx.fillRect(portX+3, portY+34, portW-6, 3);
        const gradMac = ctx.createRadialGradient(s.x+portW*0.38, portY+30, 0, s.x+portW*0.38, portY+30, 3);
        gradMac.addColorStop(0,'#f4d03f'); gradMac.addColorStop(1,'#b7950b');
        ctx.fillStyle = gradMac;
        ctx.beginPath(); ctx.arc(s.x+portW*0.38, portY+30, 3, 0, Math.PI*2); ctx.fill();
        // Degrau de pedra
        ctx.fillStyle = '#5a5040';
        ctx.fillRect(portX-6, ground-4, portW+12, 4);

        // === 6. Janelas com brilho animado ===
        const jw = 22, jh = 26;
        const nJanelas = Math.max(1, Math.floor(w / 65));
        const flickerWin = 0.88 + Math.sin(t * 0.9 + s.x * 0.02) * 0.12;
        for (let j = 0; j < nJanelas; j++) {
            const jxPos = x + 14 + j * (w - 28 - jw) / Math.max(1, nJanelas - 1);
            const jyPos = yTop + 22;

            // Moldura externa de madeira escura
            ctx.fillStyle = '#2c1e14';
            ctx.fillRect(jxPos - 3, jyPos - 3, jw + 6, jh + 6);

            // Vidraça com luz quente interna + glow animado
            const gJan = ctx.createRadialGradient(jxPos+jw*0.5, jyPos+jh*0.4, 0, jxPos+jw*0.5, jyPos+jh*0.4, jw);
            gJan.addColorStop(0, 'rgba(255,240,150,'+(0.95*flickerWin)+')');
            gJan.addColorStop(0.5, 'rgba(255,200,80,'+(0.80*flickerWin)+')');
            gJan.addColorStop(1, 'rgba(200,130,20,'+(0.40*flickerWin)+')');
            ctx.fillStyle = gJan;
            ctx.fillRect(jxPos, jyPos, jw, jh);

            // Reflexo brilhante (destaque de vidro)
            ctx.fillStyle = 'rgba(255,255,255,0.28)';
            ctx.fillRect(jxPos+1, jyPos+1, jw*0.35, jh*0.30);

            // Cruz da esquadria
            ctx.strokeStyle = '#2c1e14'; ctx.lineWidth = 1.8;
            ctx.strokeRect(jxPos, jyPos, jw, jh);
            ctx.beginPath();
            ctx.moveTo(jxPos+jw/2, jyPos); ctx.lineTo(jxPos+jw/2, jyPos+jh);
            ctx.moveTo(jxPos, jyPos+jh/2); ctx.lineTo(jxPos+jw, jyPos+jh/2);
            ctx.stroke();

            // Halo de luz suave ao redor da janela (no muro)
            ctx.shadowColor = 'rgba(255,200,60,0.55)';
            ctx.shadowBlur = 14 * flickerWin;
            ctx.fillStyle = 'transparent';
            ctx.fillRect(jxPos, jyPos, jw, jh);
            ctx.shadowBlur = 0;

            // Jardineira
            ctx.fillStyle = '#3e2710';
            ctx.fillRect(jxPos-3, jyPos+jh+2, jw+6, 7);
            const flores2 = ['#e74c3c','#e91e63','#f39c12','#8e44ad'];
            for (let fi = 0; fi < 4; fi++) {
                ctx.fillStyle = flores2[fi % flores2.length];
                ctx.beginPath();
                ctx.arc(jxPos+2+fi*(jw/3.5), jyPos+jh+4, 2.8, 0, Math.PI*2);
                ctx.fill();
            }
        }

        // === 7. Placa decorativa da loja ===
        if (s.icone) {
            const sxP = x - 14;
            const syP = yTop + 32;
            // Suporte de ferro
            ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(x, syP); ctx.lineTo(sxP+4, syP); ctx.lineTo(sxP+4, syP-10); ctx.stroke();
            // Placa de madeira escura
            const gradPlaca = ctx.createLinearGradient(sxP-12, syP+2, sxP+12, syP+20);
            gradPlaca.addColorStop(0,'#6d4c41'); gradPlaca.addColorStop(1,'#3e2723');
            ctx.fillStyle = gradPlaca;
            ctx.fillRect(sxP-12, syP+2, 24, 20);
            ctx.strokeStyle = '#1a0f0f'; ctx.lineWidth = 1.5;
            ctx.strokeRect(sxP-12, syP+2, 24, 20);
            ctx.font = '14px Arial'; ctx.textAlign = 'center';
            ctx.fillText(s.icone, sxP, syP+16);
        }

        // === 8. Nome do edifício (pequeno, quando perto) ===
        if (s.nome) {
            ctx.save();
            ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center';
            ctx.fillStyle = 'rgba(0,0,0,0.55)';
            ctx.fillText(s.nome, s.x+1, yTop - 4 + 1);
            ctx.fillStyle = 'rgba(255,245,200,0.90)';
            ctx.fillText(s.nome, s.x, yTop - 4);
            ctx.restore();
        }

        // === 9. Telhado volumétrico 2.5D — Gradiente + Telhas ===
        const rAlt = h * 0.50;
        const beiral = 16;
        const corTelh = s.corTelhado || '#a93226';
        const rT = parseInt(corTelh.slice(1,3),16);
        const gT = parseInt(corTelh.slice(3,5),16);
        const bT = parseInt(corTelh.slice(5,7),16);
        const corTelhClara = 'rgb('+Math.min(255,rT+40)+','+Math.min(255,gT+35)+','+Math.min(255,bT+30)+')';
        const corTelhEscura = 'rgb('+Math.max(0,rT-45)+','+Math.max(0,gT-40)+','+Math.max(0,bT-35)+')';

        // Vertente lateral (sombra intensa)
        const gradLateral = ctx.createLinearGradient(x+w, yTop-rAlt*0.4, x+w+depth, yTop-rAlt*0.4-depth*0.3);
        gradLateral.addColorStop(0, corTelhEscura);
        gradLateral.addColorStop(1, '#1a130d');
        ctx.fillStyle = gradLateral;
        ctx.beginPath();
        ctx.moveTo(s.x, yTop - rAlt);
        ctx.lineTo(s.x + depth, yTop - rAlt - depth * 0.55);
        ctx.lineTo(x + w + beiral + depth, yTop - depth * 0.55);
        ctx.lineTo(x + w + beiral, yTop);
        ctx.closePath(); ctx.fill();

        // Vertente frontal com gradiente solar realista
        const gradTelh = ctx.createLinearGradient(x, yTop, s.x, yTop - rAlt);
        gradTelh.addColorStop(0, corTelhClara);
        gradTelh.addColorStop(0.45, corTelh);
        gradTelh.addColorStop(1, corTelhEscura);
        ctx.fillStyle = gradTelh;
        ctx.beginPath();
        ctx.moveTo(x - beiral, yTop);
        ctx.lineTo(s.x, yTop - rAlt);
        ctx.lineTo(x + w + beiral, yTop);
        ctx.closePath(); ctx.fill();

        // Beiral com sombra profunda
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.fillRect(x - beiral, yTop - 1, w + beiral * 2, 6);
        ctx.fillStyle = 'rgba(255,255,255,0.10)';
        ctx.fillRect(x - beiral, yTop - 1, w + beiral * 2, 1.5);

        // Linhas de telhas cerâmicas com arredondamento
        ctx.strokeStyle = 'rgba(0,0,0,0.28)'; ctx.lineWidth = 2.5;
        for (let ri = 1; ri <= 6; ri++) {
            const fY = yTop - (ri / 7) * rAlt;
            const fX0 = x - beiral + (ri / 7) * (s.x - (x - beiral));
            const fX1 = x + w + beiral - (ri / 7) * ((x + w + beiral) - s.x);
            ctx.beginPath(); ctx.moveTo(fX0, fY); ctx.lineTo(fX1, fY); ctx.stroke();
        }

        // Água-furtada (janela de sótão) para edifícios grandes
        if (w >= 130) {
            const tWx = s.x - 15, tWy = yTop - rAlt * 0.52;
            ctx.fillStyle = '#2a1c12';
            ctx.fillRect(tWx, tWy, 30, 22);
            // Vidraça luminosa
            const gAttic = ctx.createRadialGradient(tWx+15, tWy+10, 0, tWx+15, tWy+10, 12);
            gAttic.addColorStop(0, 'rgba(255,230,100,0.90)');
            gAttic.addColorStop(1, 'rgba(200,130,30,0.30)');
            ctx.fillStyle = gAttic;
            ctx.fillRect(tWx+4, tWy+4, 22, 14);
            // Mini telhado da trapeira
            ctx.fillStyle = corTelh;
            ctx.beginPath();
            ctx.moveTo(tWx-4, tWy); ctx.lineTo(tWx+15, tWy-12); ctx.lineTo(tWx+34, tWy);
            ctx.closePath(); ctx.fill();
        }

        // === 10. Chaminé com fumaça densa e animada ===
        const chiX = s.x + w * 0.22;
        const chiY = yTop - rAlt * 0.72;
        // Tijolo
        const gradChi = ctx.createLinearGradient(chiX-8, chiY, chiX+8, chiY);
        gradChi.addColorStop(0,'#6b4c3a'); gradChi.addColorStop(1,'#4a3326');
        ctx.fillStyle = gradChi;
        ctx.fillRect(chiX - 8, chiY, 16, 28);
        ctx.fillStyle = '#8a6550';
        ctx.fillRect(chiX - 10, chiY, 20, 4);

        // Juntas de tijolo
        ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = 1;
        for (let bi = 1; bi < 5; bi++) {
            ctx.beginPath(); ctx.moveTo(chiX-8, chiY+bi*5.5); ctx.lineTo(chiX+8, chiY+bi*5.5); ctx.stroke();
        }

        // Fumaça volumétrica animada (3 camadas)
        const fA = Math.sin(t * 1.6 + s.x * 0.03) * 4;
        const fB = Math.sin(t * 2.1 + s.x * 0.05) * 6;
        const fC = Math.cos(t * 1.3 + s.x * 0.04) * 3;
        ctx.fillStyle = 'rgba(210,210,220,0.50)';
        ctx.beginPath(); ctx.arc(chiX+fA, chiY-12, 8, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = 'rgba(200,200,215,0.35)';
        ctx.beginPath(); ctx.arc(chiX-fA*1.3, chiY-26, 12, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = 'rgba(190,190,210,0.22)';
        ctx.beginPath(); ctx.arc(chiX+fB, chiY-42, 17, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = 'rgba(180,180,205,0.12)';
        ctx.beginPath(); ctx.arc(chiX+fC, chiY-60, 22, 0, Math.PI*2); ctx.fill();

        ctx.restore();
    }

    // ============================================================================
    // BARRACAS DE FEIRA MEDIEVAL (Mercado de Davahl)
    // ============================================================================

    function desenharBarraca(ctx, s, t) {
        ctx.save();
        ctx.translate(s.x, s.base);

        // Sombra no solo
        ctx.fillStyle = 'rgba(10, 15, 20, 0.35)';
        ctx.beginPath();
        ctx.ellipse(0, -2, 28, 10, 0, 0, Math.PI * 2);
        ctx.fill();

        // Bancada de madeira
        ctx.fillStyle = '#5d4037';
        ctx.fillRect(-22, -18, 44, 18);
        ctx.fillStyle = '#8d6e63';
        ctx.fillRect(-24, -20, 48, 4);

        // Caixotes e produtos na bancada
        ctx.font = '13px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(s.icone || '📦', 0, -24);

        // Postes de suporte do toldo
        ctx.fillStyle = '#3e2723';
        ctx.fillRect(-20, -48, 3, 30);
        ctx.fillRect(17, -48, 3, 30);

        // Toldo listrado em tecido (com franjas e sombra)
        const c1 = s.corToldo1 || '#c0392b';
        const c2 = s.corToldo2 || '#f1c40f';
        const listras = 6;
        const larListra = 50 / listras;

        for (let i = 0; i < listras; i++) {
            ctx.fillStyle = (i % 2 === 0) ? c1 : c2;
            ctx.beginPath();
            ctx.moveTo(-25 + i * larListra, -38);
            ctx.lineTo(-25 + (i + 1) * larListra, -38);
            ctx.lineTo(-20 + (i + 1) * larListra * 0.8, -50);
            ctx.lineTo(-20 + i * larListra * 0.8, -50);
            ctx.closePath();
            ctx.fill();

            // Franjas onduladas
            ctx.beginPath();
            ctx.arc(-25 + i * larListra + larListra / 2, -37, larListra / 2, 0, Math.PI);
            ctx.fill();
        }

        ctx.restore();
    }

    // ============================================================================
    // BANCOS DE MADEIRA DA PRAÇA
    // ============================================================================
    function desenharBanco(ctx, s, t) {
        ctx.save();
        ctx.translate(s.x, s.base);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.beginPath(); ctx.ellipse(0, -2, 16, 5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#4e342e';
        ctx.fillRect(-14, -14, 28, 4); // Encosto
        ctx.fillRect(-14, -8, 28, 4);  // Assento
        ctx.fillStyle = '#212121';    // Pés de ferro
        ctx.fillRect(-12, -8, 2.5, 8);
        ctx.fillRect(10, -8, 2.5, 8);
        ctx.restore();
    }

    // ============================================================================
    // GRANDE FONTE DE DAVAHL EM 3 NÍVEIS (Escultura, Jatos e Partículas)
    // ============================================================================
    function desenharFonte(ctx, s, t) {
        ctx.save();
        ctx.translate(s.x, s.base);

        // 1. Grande Bacia Inferior em Mármore Esculpido
        ctx.fillStyle = '#455a64';
        ctx.beginPath(); ctx.ellipse(0, -6, 68, 22, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#78909c';
        ctx.beginPath(); ctx.ellipse(0, -10, 64, 20, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#b0bec5';
        ctx.beginPath(); ctx.ellipse(0, -13, 58, 17, 0, 0, Math.PI * 2); ctx.fill();

        // Água cristalina turquesa da bacia inferior
        ctx.fillStyle = '#0288d1';
        ctx.beginPath(); ctx.ellipse(0, -13, 53, 14, 0, 0, Math.PI * 2); ctx.fill();

        // Ondulações concêntricas na água
        const ond1 = (t * 25) % 48;
        const ond2 = ((t * 25) + 24) % 48;
        ctx.strokeStyle = 'rgba(224, 247, 250, 0.5)';
        ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.ellipse(0, -13, ond1, ond1 * 0.28, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(0, -13, ond2, ond2 * 0.28, 0, 0, Math.PI * 2); ctx.stroke();

        // 2. Coluna e Taça Intermediária
        ctx.fillStyle = '#607d8b';
        ctx.fillRect(-9, -46, 18, 36);
        ctx.fillStyle = '#90a4ae';
        ctx.beginPath(); ctx.ellipse(0, -46, 32, 10, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#039be5';
        ctx.beginPath(); ctx.ellipse(0, -47, 28, 8, 0, 0, Math.PI * 2); ctx.fill();

        // 3. Pináculo Superior e Taça de Topo
        ctx.fillStyle = '#78909c';
        ctx.fillRect(-5, -68, 10, 22);
        ctx.beginPath(); ctx.ellipse(0, -68, 16, 5, 0, 0, Math.PI * 2); ctx.fill();

        // Jatos parabólicos de água com física e névoa
        const jWave = Math.sin(t * 3.5) * 3;
        ctx.strokeStyle = 'rgba(224, 247, 250, 0.85)';
        ctx.lineWidth = 2.8;

        // Jato central alto
        ctx.beginPath();
        ctx.moveTo(0, -70);
        ctx.quadraticCurveTo(jWave, -96, 0, -72);
        ctx.stroke();

        // 4 jatos arqueados vertendo nas laterais
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -70); ctx.quadraticCurveTo(-26 + jWave, -78, -38, -14);
        ctx.moveTo(0, -70); ctx.quadraticCurveTo(26 - jWave, -78, 38, -14);
        ctx.moveTo(0, -48); ctx.quadraticCurveTo(-18, -56, -26, -14);
        ctx.moveTo(0, -48); ctx.quadraticCurveTo(18, -56, 26, -14);
        ctx.stroke();

        // Gotas e névoa cintilante de spray d'água
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.beginPath();
        ctx.arc(-36 + jWave * 0.5, -14, 2.2, 0, Math.PI * 2);
        ctx.arc(36 - jWave * 0.5, -14, 2.2, 0, Math.PI * 2);
        ctx.arc(jWave * 0.8, -94, 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    // ============================================================================
    // POSTES DE ILUMINAÇÃO VITORIANA EM FERRO FORJADO
    // ============================================================================
    function desenharLampada(ctx, s, t) {
        ctx.save();
        ctx.translate(s.x, s.base);

        // Haste de ferro forjado trabalhada
        ctx.fillStyle = '#1c1f24';
        ctx.fillRect(-2.5, -46, 5, 46);
        ctx.fillRect(-6, -6, 12, 6); // Base decorativa do poste

        // Braço curvado do lampião
        ctx.strokeStyle = '#1c1f24';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(0, -42);
        ctx.quadraticCurveTo(8, -48, 0, -54);
        ctx.stroke();

        // Lanterna de vidro facetado com topo de latão
        ctx.fillStyle = '#37474f';
        ctx.fillRect(-6, -56, 12, 3);
        ctx.fillStyle = '#263238';
        ctx.beginPath();
        ctx.moveTo(-6, -56); ctx.lineTo(0, -64); ctx.lineTo(6, -56);
        ctx.closePath(); ctx.fill();

        // Chama cintilante e brilho central
        const flicker = 0.85 + Math.sin(t * 3.8 + s.x) * 0.15;
        ctx.fillStyle = '#fff9c4';
        ctx.shadowColor = '#f39c12';
        ctx.shadowBlur = 16 * flicker;
        ctx.beginPath();
        ctx.arc(0, -50, 4.5 * flicker, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    // ============================================================================
    // ÁRVORES URBANAS COM MURETA CIRCULAR DE PEDRA
    // ============================================================================
    function desenharArvoreCidade(ctx, s, t) {
        ctx.save();
        ctx.translate(s.x, s.base);

        // Mureta circular de contenção em granito
        ctx.strokeStyle = '#5d5446';
        ctx.lineWidth = 3.5;
        ctx.beginPath(); ctx.ellipse(0, -2, 22, 8, 0, 0, Math.PI * 2); ctx.stroke();

        // Tronco de carvalho com casca e raízes
        ctx.fillStyle = '#3e2714';
        ctx.beginPath();
        ctx.moveTo(-6, 0); ctx.lineTo(-4, -36); ctx.lineTo(4, -36); ctx.lineTo(6, 0);
        ctx.closePath(); ctx.fill();

        // Copa em 3 camadas de domos arredondados (Balanço ao vento)
        const sway = Math.sin(t * 1.5 + s.x * 0.05) * 2;

        // Camada 1: Sombra profunda
        ctx.fillStyle = '#145a32';
        ctx.beginPath();
        ctx.arc(-14 + sway, -46, 18, 0, Math.PI * 2);
        ctx.arc(14 + sway, -46, 18, 0, Math.PI * 2);
        ctx.arc(0 + sway, -58, 22, 0, Math.PI * 2);
        ctx.fill();

        // Camada 2: Verde folha vibrante
        ctx.fillStyle = '#1e8449';
        ctx.beginPath();
        ctx.arc(-10 + sway, -48, 15, 0, Math.PI * 2);
        ctx.arc(10 + sway, -48, 15, 0, Math.PI * 2);
        ctx.arc(0 + sway, -60, 18, 0, Math.PI * 2);
        ctx.fill();

        // Camada 3: Iluminação superior solar
        ctx.fillStyle = '#2ecc71';
        ctx.beginPath();
        ctx.arc(-4 + sway, -64, 11, 0, Math.PI * 2);
        ctx.arc(4 + sway, -62, 9, 0, Math.PI * 2);
        ctx.fill();

        // Florzinhas / frutos na copa
        ctx.fillStyle = '#f48fb1';
        ctx.beginPath();
        ctx.arc(-12 + sway, -44, 2.2, 0, Math.PI * 2);
        ctx.arc(8 + sway, -52, 2.2, 0, Math.PI * 2);
        ctx.arc(2 + sway, -66, 2.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    // ============================================================================
    // TORRES DE VIGIA CIRCULARES NOS VÉRTICES DAS MURALHAS
    // ============================================================================
    function desenharTorreVigia(ctx, s, t) {
        ctx.save();
        ctx.translate(s.x, s.base);

        // Sombra no solo
        ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
        ctx.beginPath(); ctx.ellipse(12, 6, 32, 14, 0.2, 0, Math.PI * 2); ctx.fill();

        // Corpo cilíndrico de alvenaria de pedra
        ctx.fillStyle = '#4a443a';
        ctx.fillRect(-20, -75, 40, 75);
        ctx.fillStyle = '#635b4e';
        ctx.fillRect(-18, -75, 26, 75);

        // Seteiras verticais de vigia
        ctx.fillStyle = '#1a1713';
        ctx.fillRect(-3, -52, 6, 14);
        ctx.fillRect(-3, -28, 6, 14);

        // Ameias em balanço
        ctx.fillStyle = '#7a7060';
        ctx.fillRect(-24, -84, 48, 10);
        ctx.fillStyle = '#3c352b';
        ctx.fillRect(-24, -75, 48, 4);

        // Telhado cônico em ardósia azulada
        ctx.fillStyle = '#2c3e50';
        ctx.beginPath();
        ctx.moveTo(-26, -84); ctx.lineTo(0, -125); ctx.lineTo(26, -84);
        ctx.closePath(); ctx.fill();

        // Destaque solar na vertente esquerda
        ctx.fillStyle = '#34495e';
        ctx.beginPath();
        ctx.moveTo(-26, -84); ctx.lineTo(0, -125); ctx.lineTo(0, -84);
        ctx.closePath(); ctx.fill();

        // Catavento / ponta de lança de bronze no pináculo
        ctx.fillStyle = '#f39c12';
        ctx.fillRect(-1.5, -135, 3, 12);
        ctx.beginPath(); ctx.arc(0, -135, 3, 0, Math.PI * 2); ctx.fill();

        ctx.restore();
    }

    // ============================================================================
    // PORTAIS DE ENTRADA E RETORNO (Vórtices Cósmicos de Davahl)
    // ============================================================================
    function desenharVortex(ctx, x, y, t, cor) {
        ctx.save();
        ctx.shadowColor = cor;
        ctx.shadowBlur = 20;
        ctx.fillStyle = 'rgba(10, 5, 20, 0.7)';
        ctx.beginPath(); ctx.arc(x, y, 56, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 26;
        ctx.strokeStyle = cor;
        ctx.globalAlpha = 0.85;
        for (let i = 0; i < 5; i++) {
            const raio = 18 + i * 8;
            const a0 = t * 1.5 + i * 1.25;
            ctx.lineWidth = 3.2;
            ctx.beginPath();
            ctx.arc(x, y, raio, a0, a0 + Math.PI * 0.8);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.fillStyle = cor;
        ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }

    function desenharPortalCidadeVerde(t) {
        const ctx = global.ctx;
        if (ctx) desenharVortex(ctx, PORTA_CIDADE_VERDE.x, PORTA_CIDADE_VERDE.y, t, '#f1c40f');
    }

    function desenharPortalCidadeRetorno(t) {
        const ctx = global.ctx;
        if (ctx) desenharVortex(ctx, PORTA_CIDADE_RETORNO.x, PORTA_CIDADE_RETORNO.y, t, '#f1c40f');
    }

    // ============================================================================
    // API PÚBLICA ISOMÓRFICA
    // ============================================================================
    const api = {
        TILE: TILE,
        CID_X0: CID_X0, CID_X1: CID_X1, CID_Y1: CID_Y1,
        COLS: COLS, ROWS: ROWS,
        ALT_LIVRE: ALT_LIVRE, ALT_PEQUENA: ALT_PEQUENA, ALT_MEDIA: ALT_MEDIA, ALT_ALTA: ALT_ALTA,
        PORTA_CIDADE_VERDE: PORTA_CIDADE_VERDE,
        PORTA_CIDADE_RETORNO: PORTA_CIDADE_RETORNO,
        PORTAL_MAPAS: PORTAL_MAPAS,
        gerarCidade: gerarCidade,
        grid: function () { return grid; },
        isCidade: isCidade,
        colideCidade: colideCidade,
        colideProjetilCidade: colideProjetilCidade,
        colideMapaAtivo: colideMapaAtivo,
        infoPortalCidade: infoPortalCidade,
        onUpdatePosicao: onUpdatePosicao,
        depositarPosicaoSegura: depositarPosicaoSegura,
        desenharCenarioCidade: desenharCenarioCidade,
        coletarCidadeSortables: coletarCidadeSortables,
        desenharPortalCidadeVerde: desenharPortalCidadeVerde,
        desenharPortalCidadeRetorno: desenharPortalCidadeRetorno,
        tocarPortalViagem: tocarPortalViagem
    };

    // Expoê para o navegador
    if (global.window) {
        gerarCidade();
        cidadeChainAnterior = global.chainMapas;
        global.chainMapas = { onUpdatePosicao: onUpdatePosicao };

        global.desenharCenarioCidade = desenharCenarioCidade;
        global.coletarCidadeSortables = coletarCidadeSortables;
        global.colideCidade = colideCidade;
        global.colideProjetilCidade = colideProjetilCidade;
        global.colideMapaAtivo = colideMapaAtivo;
        global.desenharPortalCidadeVerde = desenharPortalCidadeVerde;
        global.desenharPortalCidadeRetorno = desenharPortalCidadeRetorno;
        global.tocarPortalViagem = tocarPortalViagem;
        global.mapaCidade = api;
    }

    // Expoê para o Node.js
    if (typeof module !== 'undefined' && module.exports) {
        if (!grid) gerarCidade();
        module.exports = api;
    }
})(typeof window !== 'undefined' ? window : this);