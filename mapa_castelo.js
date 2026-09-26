
// ============================================================================
// mapa_castelo.js — DUNGEON: «Castelo Anda 1»
// Módulo isomórfico: roda no NAVEGADOR (window) E no SERVIDOR (module.exports).
//
//   Castelo: X ∈ [82000, 84200], Y ∈ [0, 1800]
//   55 colunas × 45 linhas de tiles de 40px
//   TILE = 40px
//
// Salas:
//  1. Câmara de Entrada
//  2. Corredor de Acesso
//  3. Sala dos Guardas
//  4. Câmara de Tortura
//  5. Câmara Secreta
//  6. Biblioteca das Sombras
//  7. Corredor dos Pilares
//  8. Sala dos Troféus
//  9. Sala de Armas
// 10. Sala do Trono
// 11. Câmara das Correntes
// 12. Antessala do Boss
// 13. [ARENA CIRCULAR do Boss] — final da DG
// ============================================================================
(function (global) {
    'use strict';

    const TILE = 40;
    const CST_X0 = 82000;
    const CST_X1 = 84200;
    const CST_Y1 = 1800;
    const COLS = (CST_X1 - CST_X0) / TILE;  // 55
    const ROWS = CST_Y1 / TILE;              // 45

    const ALT_LIVRE = 0, ALT_PEQUENA = 1, ALT_MEDIA = 2, ALT_ALTA = 3;

    // Portal de entrada (na Zona Zero, leste)
    const PORTAL_ZONAZERO_ENTRADA = { x: 81900, y: 1000, r: 56, alvo: { x: CST_X0 + 200, y: 900 } };
    // Portal de saída (dentro do Castelo, câmara de entrada)
    const PORTAL_CASTELO_SAIDA = { x: CST_X0 + 60, y: 900, r: 52, alvo: { x: 81900, y: 1060 } };
    // Spawn seguro na câmara de entrada
    const SPAWN_CASTELO = { x: CST_X0 + 200, y: 900 };

    let grid = null;
    let sortables = [];
    let decor = [];
    let luzes = [];
    let correntes = [];

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
    function hash3(a, b, c) {
        let n = (a * 374761393 + b * 668265263 + c * 2246822519) | 0;
        n = Math.imul(n ^ (n >>> 13), 1274126177);
        return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
    }

    // ---------- Helpers de grid ----------
    function setTile(c, l, tipo, alt) {
        if (l >= 0 && l < ROWS && c >= 0 && c < COLS) {
            if (alt === undefined) alt = (tipo === 'parede' ? ALT_ALTA : (tipo === 'chao' ? ALT_LIVRE : ALT_PEQUENA));
            grid[l][c] = { tipo: tipo, alt: alt };
        }
    }
    function getTile(c, l) {
        if (l < 0 || l >= ROWS || c < 0 || c >= COLS) return { tipo: 'parede', alt: ALT_ALTA };
        return grid[l][c];
    }
    function escavarRect(c0, l0, c1, l1) {
        for (let l = l0; l <= l1; l++)
            for (let c = c0; c <= c1; c++)
                setTile(c, l, 'chao', ALT_LIVRE);
    }
    function escavarCircle(cx, cy, r) {
        for (let l = cy - r; l <= cy + r; l++)
            for (let c = cx - r; c <= cx + r; c++)
                if (Math.hypot(c - cx, l - cy) <= r) setTile(c, l, 'chao', ALT_LIVRE);
    }
    function escavarCorredor(c0, l0, c1, l1, larg) {
        larg = larg || 1;
        let steps = Math.max(Math.abs(c1 - c0), Math.abs(l1 - l0)) * 2 + 1;
        for (let i = 0; i <= steps; i++) {
            let t = steps > 0 ? i / steps : 0;
            let cc = Math.round(c0 + (c1 - c0) * t);
            let ll = Math.round(l0 + (l1 - l0) * t);
            for (let dy = -larg; dy <= larg; dy++)
                for (let dx = -larg; dx <= larg; dx++)
                    setTile(cc + dx, ll + dy, 'chao', ALT_LIVRE);
        }
    }

    // ---------- Geração principal ----------
    function gerarCastelo() {
        if (grid) return grid;

        grid = [];
        for (let l = 0; l < ROWS; l++) {
            grid[l] = [];
            for (let c = 0; c < COLS; c++) grid[l][c] = { tipo: 'parede', alt: ALT_ALTA };
        }

        // ============================
        // SALA 1: Câmara de Entrada
        // cols [1,9], rows [19,26]
        // ============================
        escavarRect(1, 19, 9, 26);

        // Corredor Entrada → Guardas
        escavarCorredor(9, 22, 14, 22, 1);

        // ============================
        // SALA 2: Sala dos Guardas
        // cols [14,26], rows [16,28]
        // ============================
        escavarRect(14, 16, 26, 28);

        // Corredor Norte (Guardas → Tortura)
        escavarCorredor(20, 16, 20, 11, 1);

        // Corredor Sul (Guardas → Trono)
        escavarCorredor(19, 28, 19, 33, 1);

        // ============================
        // SALA 3: Corredor dos Pilares
        // cols [26,38], rows [20,24]
        // ============================
        escavarRect(26, 20, 38, 24);

        // ============================
        // SALA 4: Câmara de Tortura
        // cols [13,25], rows [4,13]
        // ============================
        escavarRect(13, 4, 25, 13);

        // Corredor Tortura → Biblioteca
        escavarCorredor(25, 8, 28, 8, 1);

        // ============================
        // SALA 5: Câmara Secreta
        // cols [23,29], rows [14,18]
        // ============================
        escavarRect(23, 14, 29, 18);
        escavarCorredor(24, 16, 24, 14, 0);

        // ============================
        // SALA 6: Biblioteca das Sombras
        // cols [28,39], rows [4,14]
        // ============================
        escavarRect(28, 4, 39, 14);

        // Corredor Biblioteca → Troféus
        escavarCorredor(39, 9, 42, 9, 1);

        // ============================
        // SALA 7: Sala dos Troféus
        // cols [38,46], rows [12,22]
        // ============================
        escavarRect(38, 12, 46, 22);

        // ============================
        // SALA 8: Sala de Armas
        // cols [38,46], rows [22,31]
        // ============================
        escavarRect(38, 22, 46, 31);

        // Corredor Armas → Antessala
        escavarCorredor(42, 31, 42, 35, 1);

        // ============================
        // SALA 9: Câmara das Correntes
        // cols [27,35], rows [33,41]
        // ============================
        escavarRect(27, 33, 35, 41);

        // ============================
        // SALA 10: Sala do Trono
        // cols [12,27], rows [33,43]
        // ============================
        escavarRect(12, 33, 27, 43);

        // ============================
        // SALA 11: Antessala do Boss
        // cols [35,46], rows [33,43]
        // ============================
        escavarRect(35, 33, 46, 43);

        // ============================
        // SALA 12: ARENA CIRCULAR DO BOSS
        // centro: col 47, row 22, raio 7
        // ============================
        escavarCircle(47, 22, 7);

        // Conectar Troféus → Arena
        escavarCorredor(46, 17, 40, 17, 1);
        escavarCorredor(46, 17, 46, 22, 1);
        // Conectar Armas → Arena
        escavarCorredor(46, 27, 46, 22, 1);
        // Conectar Antessala → Arena
        escavarCorredor(46, 38, 47, 38, 1);
        escavarCorredor(47, 38, 47, 29, 1);

        // ============================
        // DECORAÇÃO: tiles especiais
        // ============================
        // Pilares Corredor dos Pilares
        for (let c = 28; c <= 36; c += 3) {
            setTile(c, 20, 'pilar', ALT_ALTA);
            setTile(c, 24, 'pilar', ALT_ALTA);
        }
        // Colunas Sala do Trono
        setTile(13, 35, 'coluna', ALT_ALTA);
        setTile(13, 41, 'coluna', ALT_ALTA);
        setTile(26, 35, 'coluna', ALT_ALTA);
        setTile(26, 41, 'coluna', ALT_ALTA);
        // Trono
        setTile(18, 43, 'trono',  ALT_PEQUENA);
        setTile(19, 43, 'trono',  ALT_PEQUENA);
        setTile(20, 43, 'trono',  ALT_PEQUENA);
        // Gaiolas
        setTile(16, 6,  'gaiola', ALT_PEQUENA);
        setTile(21, 6,  'gaiola', ALT_PEQUENA);
        // Armaduras em pé
        setTile(39, 23, 'armadura_pe',  ALT_PEQUENA);
        setTile(45, 23, 'armadura_pe',  ALT_PEQUENA);
        // Pedestais Troféus
        setTile(40, 21, 'pedestal', ALT_PEQUENA);
        setTile(44, 21, 'pedestal', ALT_PEQUENA);
        // Pedestais Boss Arena
        setTile(44, 18, 'pedestal_boss', ALT_PEQUENA);
        setTile(50, 18, 'pedestal_boss', ALT_PEQUENA);
        setTile(44, 26, 'pedestal_boss', ALT_PEQUENA);
        setTile(50, 26, 'pedestal_boss', ALT_PEQUENA);
        // Altar central da Arena
        setTile(47, 22, 'altar', ALT_PEQUENA);
        // Portões
        setTile(30, 40, 'portao_ferro', ALT_ALTA);
        setTile(32, 40, 'portao_ferro', ALT_ALTA);
        // Runas no piso
        setTile(40, 39, 'runa_chao', ALT_LIVRE);

        // ============================
        // FONTES DE LUZ (tochas, braseiros, archotes)
        // ============================
        luzes = [];
        function addLuz(tipo, c, l, r, seed) {
            luzes.push({ tipo: tipo, cx: CST_X0 + c * TILE + TILE / 2, cy: l * TILE + TILE / 2, r: r || 80, seed: seed || (c * 11 + l * 7) });
        }
        // ===== REGRA DE ILUMINAÇÃO DO CASTELO =====
        // Tochas SÓ na parede / pilar / coluna (exigem tile SÓLIDO adjacente
        // ORTOGONAL). Nenhuma tocha fica no corredor de caminhada: no centro das
        // salas a luz vem de braseiros, velas e dos archotes da Arena do Boss.
        // Câmara de Entrada
        addLuz('tocha', 1, 20, 80, 10); addLuz('tocha', 1, 25, 80, 20);
        addLuz('tocha', 9, 20, 80, 30); addLuz('tocha', 9, 25, 80, 40);
        // Sala Guardas
        addLuz('tocha', 14, 17, 85, 50); addLuz('tocha', 14, 27, 85, 60);
        addLuz('tocha', 26, 27, 85, 80);
        addLuz('tocha', 21, 28, 80, 100);
        addLuz('tocha', 27, 18, 80, 70);   // Câmara Secreta (parede sul)
        addLuz('tocha', 19, 15, 75, 90);   // Corredor Norte (parede oeste)
        addLuz('braseiro', 20, 22, 130, 42);
        // Corredor dos Pilares — tochas montadas nos pilares (caminho livre)
        addLuz('tocha', 28, 21, 70, 196); addLuz('tocha', 31, 23, 70, 217);
        addLuz('tocha', 34, 21, 70, 238); addLuz('tocha', 37, 20, 70, 259);
        // Câmara de Tortura
        addLuz('tocha', 13, 5, 80, 110); addLuz('tocha', 25, 5, 80, 120);
        addLuz('tocha', 13, 12, 80, 130); addLuz('tocha', 25, 12, 80, 140);
        // Biblioteca
        addLuz('tocha', 28, 5, 80, 150); addLuz('tocha', 39, 5, 80, 160);
        addLuz('tocha', 28, 13, 80, 170);
        addLuz('tocha', 37, 14, 75, 190);  // canto sudoeste (parede sul)
        addLuz('velas', 32, 9, 60, 99);
        // Salão dos Troféus / Sala de Armas
        addLuz('tocha', 40, 12, 85, 180); addLuz('tocha', 46, 13, 85, 200);
        addLuz('tocha', 38, 19, 85, 210); addLuz('tocha', 37, 24, 85, 230);
        addLuz('tocha', 38, 30, 85, 250); addLuz('tocha', 45, 31, 85, 260);
        // Câmara das Correntes
        addLuz('tocha', 27, 33, 75, 270); addLuz('tocha', 34, 33, 75, 280);
        addLuz('tocha', 27, 41, 75, 290); addLuz('tocha', 34, 41, 75, 300);
        // Sala do Trono
        addLuz('tocha', 12, 34, 90, 310);
        addLuz('tocha', 12, 42, 90, 330); addLuz('tocha', 27, 42, 90, 340);
        addLuz('braseiro', 16, 38, 140, 17);
        addLuz('braseiro', 24, 38, 140, 33);
        // Antessala
        addLuz('tocha', 36, 33, 85, 350); addLuz('tocha', 45, 33, 85, 360);
        addLuz('tocha', 35, 42, 85, 370); addLuz('tocha', 46, 42, 85, 380);
        addLuz('velas', 40, 40, 70, 55);
        // ARENA — 12 archotes ao redor
        for (let i = 0; i < 12; i++) {
            let ang = (i / 12) * Math.PI * 2;
            let ac = 47 + Math.cos(ang) * 6.5;
            let al = 22 + Math.sin(ang) * 6.5;
            addLuz('archote', ac, al, 100, i * 13 + 400);
        }
        addLuz('braseiro', 47, 22, 160, 88); // luz central da arena
        if (typeof window !== 'undefined') window.casteloLuzes = luzes;

        // ============================
        // CORRENTES
        // ============================
        correntes = [];
        // Tortura: correntes nas paredes
        for (let c2 = 14; c2 <= 24; c2 += 2) {
            correntes.push({ x: CST_X0 + c2 * TILE + TILE / 2, y: 5 * TILE, comp: 28 + (c2 % 4) * 8, seed: c2 });
        }
        // Câmara das Correntes: correntes do teto
        for (let c2 = 28; c2 <= 34; c2 += 2) {
            correntes.push({ x: CST_X0 + c2 * TILE + TILE / 2, y: 34 * TILE, comp: 40 + (c2 % 3) * 10, seed: c2 + 50 });
        }
        // Arena: 8 correntes ao redor
        for (let i = 0; i < 8; i++) {
            let ang = (i / 8) * Math.PI * 2;
            let px = CST_X0 + (47 + Math.cos(ang) * 6.8) * TILE;
            let py = (22 + Math.sin(ang) * 6.8) * TILE;
            correntes.push({ x: px, y: py, comp: 50, seed: i + 100, arena: true });
        }

        // ============================
        // DECOR
        // ============================
        decor = [];
        const rndD = mulberry32(20260926);
        for (let i = 0; i < 300; i++) {
            let c2 = Math.floor(rndD() * COLS);
            let l2 = Math.floor(rndD() * ROWS);
            if (getTile(c2, l2).tipo !== 'chao') continue;
            let isTort = c2 >= 13 && c2 <= 25 && l2 >= 4 && l2 <= 13;
            let tipos = ['po', 'po', 'osso', 'mancha', 'musgo'];
            let tipo = isTort ? (rndD() > 0.4 ? 'mancha' : 'osso') : tipos[Math.floor(rndD() * tipos.length)];
            decor.push({
                x: CST_X0 + c2 * TILE + 4 + rndD() * (TILE - 8),
                y: l2 * TILE + 4 + rndD() * (TILE - 8),
                r: 1.5 + rndD() * 3.5,
                ang: rndD() * Math.PI * 2,
                tipo: tipo
            });
        }
        // Teias da biblioteca
        decor.push({ tipo: 'teia', x: CST_X0 + 28 * TILE + 8, y: 4 * TILE + 8, r: 22 });
        decor.push({ tipo: 'teia', x: CST_X0 + 39 * TILE + 32, y: 4 * TILE + 8, r: 18 });
        decor.push({ tipo: 'teia', x: CST_X0 + 28 * TILE + 8, y: 14 * TILE - 8, r: 15 });
        // Tapete do Trono
        decor.push({ tipo: 'tapete', x: CST_X0 + 18 * TILE, y: 37 * TILE, w: 3 * TILE, h: 5 * TILE });
        // Runa piso Antessala
        decor.push({ tipo: 'runa_piso', x: CST_X0 + 40 * TILE + TILE / 2, y: 39 * TILE + TILE / 2, r: 42 });
        // Mosaico Arena
        decor.push({ tipo: 'mosaico_arena', x: CST_X0 + 47 * TILE + TILE / 2, y: 22 * TILE + TILE / 2, r: 7 * TILE });
        // Manchas de sangue arena
        for (let i = 0; i < 8; i++) {
            let ang = rndD() * Math.PI * 2;
            let dist = 1 + rndD() * 5;
            decor.push({
                tipo: 'mancha',
                x: CST_X0 + (47 + Math.cos(ang) * dist) * TILE + TILE / 2,
                y: (22 + Math.sin(ang) * dist) * TILE + TILE / 2,
                r: 8 + rndD() * 12,
                ang: ang
            });
        }

        // ============================
        // SORTABLES
        // ============================
        sortables = [];
        for (let l2 = 0; l2 < ROWS; l2++) {
            for (let c2 = 0; c2 < COLS; c2++) {
                let cel = getTile(c2, l2);
                let sx = CST_X0 + c2 * TILE + TILE / 2;
                let sb = l2 * TILE + TILE;
                let tipos3D = ['pilar', 'coluna', 'trono', 'gaiola', 'armadura_pe', 'pedestal', 'pedestal_boss', 'altar'];
                if (tipos3D.includes(cel.tipo)) {
                    sortables.push({ tipo: cel.tipo, x: sx, base: sb, c: c2, l: l2 });
                }
            }
        }

        return grid;
    }

    // ---------- Colisão ----------
    function isCastelo(x, y) { return x >= CST_X0 && x < CST_X1; }

    // colideCastelo(x, y, raio?) — com `raio`, testa também os 4 pontos cardinais
    // a essa distância, para que entidades grandes (pet/lacaio do Summoner) não
    // fiquem com o centro encostado na parede. Sem `raio`, é teste de ponto
    // (comportamento do jogador, inalterado).
    function colideCastelo(x, y, raio) {
        if (!isCastelo(x, y)) return false;
        if (!grid) gerarCastelo();
        if (raio && raio > 0) {
            if (_tileSolidoCastelo(x, y)) return true;
            if (_tileSolidoCastelo(x - raio, y) || _tileSolidoCastelo(x + raio, y) ||
                _tileSolidoCastelo(x, y - raio) || _tileSolidoCastelo(x, y + raio)) return true;
            return false;
        }
        return _tileSolidoCastelo(x, y);
    }
    function _tileSolidoCastelo(x, y) {
        if (!isCastelo(x, y)) return false;
        if (!grid) gerarCastelo();
        let c = Math.floor((x - CST_X0) / TILE);
        let l = Math.floor(y / TILE);
        if (c < 0 || c >= COLS || l < 0 || l >= ROWS) return true;
        return grid[l][c].alt >= ALT_ALTA;
    }
    function colideProjetilCastelo(x, y) {
        if (!isCastelo(x, y)) return false;
        if (!grid) gerarCastelo();
        let c = Math.floor((x - CST_X0) / TILE);
        let l = Math.floor(y / TILE);
        if (c < 0 || c >= COLS || l < 0 || l >= ROWS) return true;
        return grid[l][c].alt >= ALT_MEDIA;
    }

    // ---------- Portal ----------
    function infoPortalCastelo(x, y) {
        if (isCastelo(x, y)) {
            if (Math.hypot(x - PORTAL_CASTELO_SAIDA.x, y - PORTAL_CASTELO_SAIDA.y) < PORTAL_CASTELO_SAIDA.r) {
                return { via: 'portal', mapa: 'zonazero', alvo: PORTAL_CASTELO_SAIDA.alvo };
            }
            return null;
        }
        if (Math.hypot(x - PORTAL_ZONAZERO_ENTRADA.x, y - PORTAL_ZONAZERO_ENTRADA.y) < PORTAL_ZONAZERO_ENTRADA.r) {
            return { via: 'portal', mapa: 'castelo', alvo: PORTAL_ZONAZERO_ENTRADA.alvo };
        }
        return null;
    }

    // ============================================================
    // RENDERIZAÇÃO
    // ============================================================
    function desenharCenarioCastelo(t) {
        const ctx = global.ctx;
        if (!ctx) return;
        if (!grid) gerarCastelo();

        let camX = global.camX || 0;
        let camY = global.camY || 0;
        let zoom = global.cameraZoomAtual || global.ZOOM_CAMERA || 1;
        let cw = ((global.canvas && global.canvas.width) || 800) / zoom;
        let ch = ((global.canvas && global.canvas.height) || 600) / zoom;

        ctx.fillStyle = '#0d0a07';
        ctx.fillRect(camX, camY, cw, ch);

        let c0 = Math.max(0, Math.floor((camX - CST_X0 - 80) / TILE));
        let c1 = Math.min(COLS - 1, Math.ceil((camX - CST_X0 + cw + 80) / TILE));
        let l0 = Math.max(0, Math.floor((camY - 80) / TILE));
        let l1 = Math.min(ROWS - 1, Math.ceil((camY + ch + 80) / TILE));

        // 1. CHÃO
        for (let l = l0; l <= l1; l++) {
            for (let c = c0; c <= c1; c++) {
                let cel = grid[l][c];
                if (cel.tipo === 'parede' || cel.tipo === 'pilar' || cel.tipo === 'coluna') continue;
                _desenharChao(ctx, CST_X0 + c * TILE, l * TILE, c, l, cel, t);
            }
        }

        // 2. DECOR DE CHÃO
        for (let i = 0; i < decor.length; i++) {
            let d = decor[i];
            if (!d.x || !d.y) continue;
            if (d.x < camX - 80 || d.x > camX + cw + 80 || d.y < camY - 80 || d.y > camY + ch + 80) continue;
            _desenharDecor(ctx, d, t);
        }

        // 3. LUZES DINÂMICAS
        for (let i = 0; i < luzes.length; i++) {
            let lz = luzes[i];
            if (lz.cx < camX - lz.r - 20 || lz.cx > camX + cw + lz.r + 20) continue;
            if (lz.cy < camY - lz.r - 20 || lz.cy > camY + ch + lz.r + 20) continue;
            _desenharLuz(ctx, lz, t);
        }

        // 4. PAREDES
        for (let l = l0; l <= l1; l++) {
            for (let c = c0; c <= c1; c++) {
                let cel = grid[l][c];
                if (cel.tipo !== 'parede' && cel.tipo !== 'portao_ferro') continue;
                _desenharParede(ctx, CST_X0 + c * TILE, l * TILE, c, l, cel);
            }
        }

        // 5. CORRENTES
        for (let i = 0; i < correntes.length; i++) {
            let cr = correntes[i];
            if (cr.x < camX - 60 || cr.x > camX + cw + 60 || cr.y < camY - 80 || cr.y > camY + ch + 80) continue;
            _desenharCorrente(ctx, cr, t);
        }

        // 6. NÉVOA RASTEIRA
        _desenharNevoa(ctx, camX, camY, cw, ch, t);

        // 7. VINHETA
        _desenharVinheta(ctx, camX, camY, cw, ch);
    }

    // ------- Chão -------
    function _desenharChao(ctx, x, y, c, l, cel, t) {
        let h1 = hash2(c, l);
        let h2v = hash3(c, l, 3);

        if (cel.tipo === 'poça' || cel.tipo === 'mancha') {
            ctx.fillStyle = '#0d0005';
            ctx.fillRect(x, y, TILE + 1, TILE + 1);
            ctx.fillStyle = 'rgba(90,0,20,0.5)';
            ctx.beginPath();
            ctx.ellipse(x + TILE / 2, y + TILE / 2 + 6, TILE * 0.4, TILE * 0.28, 0, 0, Math.PI * 2);
            ctx.fill();
            return;
        }

        // Cor base de ardósia
        let corBase = '#2a2520';
        if (h1 > 0.8) corBase = '#252015';
        else if (h1 > 0.6) corBase = '#2d2820';
        else if (h1 < 0.2) corBase = '#1e1b14';

        // Trono: piso mais rico
        if (c >= 12 && c <= 27 && l >= 33 && l <= 43) {
            corBase = h1 > 0.5 ? '#332c24' : '#2d2620';
        }
        // Arena: piso escuro mosaico
        if (Math.hypot(c - 47, l - 22) < 7.5) {
            corBase = h1 > 0.5 ? '#1f1c18' : '#252018';
        }

        ctx.fillStyle = corBase;
        ctx.fillRect(x, y, TILE + 1, TILE + 1);

        // Juntas de argamassa
        if (h1 > 0.3) {
            ctx.strokeStyle = 'rgba(15,12,8,0.5)';
            ctx.lineWidth = 1;
            let jy = y + 8 + (h2v * 22 | 0);
            ctx.beginPath(); ctx.moveTo(x, jy); ctx.lineTo(x + TILE, jy); ctx.stroke();
            let jx = x + 12 + (h1 * 16 | 0);
            ctx.beginPath(); ctx.moveTo(jx, y); ctx.lineTo(jx, y + TILE); ctx.stroke();
        }

        // Padrão mosaico na Arena
        if (Math.hypot(c - 47, l - 22) < 7.5) {
            let isLight = (c + l) % 2 === 0;
            ctx.fillStyle = isLight ? 'rgba(60,50,40,0.35)' : 'rgba(10,8,5,0.25)';
            ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
        }

        // Rachadura
        if (h1 > 0.88) {
            ctx.strokeStyle = 'rgba(10,8,5,0.4)';
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(x + h2v * TILE, y + 2);
            ctx.lineTo(x + TILE / 2, y + TILE - 2);
            ctx.stroke();
        }
    }

    // ------- Parede gótica -------
    function _desenharParede(ctx, x, y, c, l, cel) {
        let h1 = hash2(c, l);
        let h2v = hash3(c, l, 7);

        if (cel.tipo === 'portao_ferro') {
            ctx.fillStyle = '#1a1510';
            ctx.fillRect(x, y, TILE + 1, TILE + 1);
            ctx.strokeStyle = '#3a3530';
            ctx.lineWidth = 2.5;
            for (let i = 0; i <= 3; i++) {
                ctx.beginPath(); ctx.moveTo(x + i * (TILE / 3), y); ctx.lineTo(x + i * (TILE / 3), y + TILE); ctx.stroke();
            }
            ctx.beginPath(); ctx.moveTo(x, y + TILE / 2); ctx.lineTo(x + TILE, y + TILE / 2); ctx.stroke();
            ctx.fillStyle = '#5a4030';
            ctx.beginPath(); ctx.arc(x + TILE / 2, y + TILE / 2, 4, 0, Math.PI * 2); ctx.fill();
            return;
        }

        // Bloco de pedra
        let corBloco = '#1e1b14';
        if (h1 > 0.7) corBloco = '#231f18';
        else if (h1 < 0.25) corBloco = '#191611';

        ctx.fillStyle = corBloco;
        ctx.fillRect(x, y, TILE + 1, TILE + 1);

        // Alvenaria
        let blocoH = 12 + (h2v * 6 | 0);
        for (let by = y; by < y + TILE; by += blocoH) {
            let offsetX = ((by - y) / blocoH % 2 === 0) ? 0 : TILE / 2;
            for (let bx = x - offsetX; bx < x + TILE + 1; bx += TILE) {
                let bh1 = hash3((bx / TILE) | 0, (by / TILE) | 0, l);
                let bx0 = Math.max(x, bx) + 1, bx1 = Math.min(x + TILE + 1, bx + TILE) - 2;
                if (bx1 <= bx0) continue;
                ctx.fillStyle = 'rgba(' + (30 + (bh1 * 12 | 0)) + ',' + (26 + (bh1 * 9 | 0)) + ',' + (18 + (bh1 * 6 | 0)) + ',0.85)';
                ctx.fillRect(bx0, by + 1, bx1 - bx0, blocoH - 2);
                // Brilho topo bloco
                ctx.fillStyle = 'rgba(80,60,35,0.12)';
                ctx.fillRect(bx0, by + 1, bx1 - bx0, 2);
            }
        }

        // Sombra sul e leste
        ctx.fillStyle = 'rgba(0,0,0,0.38)';
        ctx.fillRect(x, y + TILE - 5, TILE + 1, 5);
        ctx.fillRect(x + TILE - 4, y, 4, TILE);

        // Mofo em alguns blocos
        if (h1 > 0.75) {
            ctx.fillStyle = 'rgba(20,35,15,0.22)';
            ctx.fillRect(x + 2, y + TILE - 10, TILE - 4, 9);
        }

        // Reflexo de luz das tochas
        let temLuzPerto = false;
        for (let i = 0; i < luzes.length; i++) {
            let lz = luzes[i];
            if (Math.hypot(lz.cx - (x + TILE / 2), lz.cy - (y + TILE / 2)) < lz.r * 0.7) { temLuzPerto = true; break; }
        }
        if (temLuzPerto) {
            ctx.fillStyle = 'rgba(180,100,20,0.07)';
            ctx.fillRect(x, y, TILE + 1, TILE + 1);
        }

        // Detalhe chanfrado gótico no topo
        ctx.fillStyle = 'rgba(60,50,35,0.18)';
        ctx.fillRect(x, y, TILE + 1, 2);
    }

    // ------- Luz dinâmica -------
    function _desenharLuz(ctx, lz, t) {
        let seed = lz.seed || 0;
        let pulso = 0.5 + Math.sin(t * 3.2 + seed * 0.7) * 0.3 + Math.sin(t * 7.1 + seed * 1.3) * 0.1;
        let r = lz.r * (0.85 + pulso * 0.3);
        let alpha = (lz.tipo === 'braseiro') ? 0.22 : (lz.tipo === 'velas') ? 0.14 : (lz.tipo === 'archote') ? 0.20 : 0.17;

        let grd = ctx.createRadialGradient(lz.cx, lz.cy, 0, lz.cx, lz.cy, r);
        if (lz.tipo === 'velas') {
            grd.addColorStop(0, 'rgba(255,220,140,' + (alpha * 1.6) + ')');
            grd.addColorStop(0.4, 'rgba(220,150,50,' + alpha + ')');
            grd.addColorStop(1, 'rgba(0,0,0,0)');
        } else if (lz.tipo === 'archote') {
            grd.addColorStop(0, 'rgba(255,180,40,' + (alpha * 1.8) + ')');
            grd.addColorStop(0.3, 'rgba(220,100,15,' + alpha + ')');
            grd.addColorStop(1, 'rgba(0,0,0,0)');
        } else {
            grd.addColorStop(0, 'rgba(255,160,30,' + (alpha * 2) + ')');
            grd.addColorStop(0.35, 'rgba(210,90,15,' + alpha + ')');
            grd.addColorStop(1, 'rgba(0,0,0,0)');
        }

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = grd;
        ctx.beginPath(); ctx.arc(lz.cx, lz.cy, r, 0, Math.PI * 2); ctx.fill();
        ctx.restore();

        ctx.save(); ctx.translate(lz.cx, lz.cy);
        if (lz.tipo === 'braseiro') _desenharBraseiro(ctx, pulso, t, seed);
        else if (lz.tipo === 'velas')   _desenharVelas(ctx, pulso, t, seed);
        else if (lz.tipo === 'archote') _desenharArchote(ctx, pulso, t, seed);
        else                            _desenharTocha(ctx, pulso, t, seed);
        ctx.restore();
    }

    function _desenharTocha(ctx, p, t, seed) {
        ctx.fillStyle = '#4a3a28';
        ctx.fillRect(-3, -20, 6, 16);
        ctx.fillStyle = '#5a4a38';
        ctx.beginPath(); ctx.arc(0, -20, 4, 0, Math.PI * 2); ctx.fill();
        let oscX = Math.sin(t * 8.5 + seed * 0.3) * 2.5;
        ctx.save(); ctx.globalAlpha = 0.92;
        ctx.fillStyle = '#ff6200';
        ctx.beginPath(); ctx.moveTo(-4, -20); ctx.quadraticCurveTo(oscX - 3, -32, 0, -38); ctx.quadraticCurveTo(oscX + 3, -32, 4, -20); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ffcc00';
        ctx.beginPath(); ctx.moveTo(-2, -20); ctx.quadraticCurveTo(oscX - 1, -28, 0, -34); ctx.quadraticCurveTo(oscX + 1, -28, 2, -20); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#fff0a0';
        ctx.beginPath(); ctx.arc(oscX * 0.3, -25, 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }

    function _desenharArchote(ctx, p, t, seed) {
        ctx.fillStyle = '#352a1e';
        ctx.fillRect(-4, 0, 8, 10);
        ctx.fillRect(-3, -8, 6, 8);
        ctx.fillStyle = '#5a4030';
        ctx.beginPath(); ctx.arc(0, -8, 5, 0, Math.PI); ctx.fill();
        let osc = Math.sin(t * 9 + seed * 0.5) * 2;
        ctx.save(); ctx.globalAlpha = 0.9;
        ctx.fillStyle = '#ff5500';
        ctx.beginPath(); ctx.moveTo(-5, -8); ctx.quadraticCurveTo(osc - 4, -20, 0, -28); ctx.quadraticCurveTo(osc + 4, -20, 5, -8); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ff9900';
        ctx.beginPath(); ctx.moveTo(-3, -8); ctx.quadraticCurveTo(osc - 2, -17, 0, -23); ctx.quadraticCurveTo(osc + 2, -17, 3, -8); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ffee66';
        ctx.beginPath(); ctx.arc(osc * 0.4, -14, 2, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }

    function _desenharBraseiro(ctx, p, t, seed) {
        ctx.strokeStyle = '#4a3a28';
        ctx.lineWidth = 2.5;
        for (let i = 0; i < 3; i++) {
            let ang = (i / 3) * Math.PI * 2;
            ctx.beginPath(); ctx.moveTo(Math.cos(ang) * 12, Math.sin(ang) * 12); ctx.lineTo(0, -18); ctx.stroke();
        }
        ctx.fillStyle = '#5a4030';
        ctx.beginPath(); ctx.ellipse(0, -18, 13, 6, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#6a5040';
        ctx.beginPath(); ctx.ellipse(0, -18, 10, 4, 0, 0, Math.PI * 2); ctx.fill();
        let osc = Math.sin(t * 6 + seed * 0.4) * 3;
        ctx.save(); ctx.globalAlpha = 0.88;
        ctx.fillStyle = '#ff4500';
        for (let i = -2; i <= 2; i++) {
            ctx.beginPath(); ctx.moveTo(i * 4, -18); ctx.quadraticCurveTo(osc + i * 3, -32, i * 2, -40); ctx.quadraticCurveTo(-osc + i * 3, -32, i * 4 + 5, -18); ctx.closePath(); ctx.fill();
        }
        ctx.fillStyle = '#ff8800';
        ctx.beginPath(); ctx.ellipse(osc * 0.5, -32, 6, 7, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffcc44';
        ctx.beginPath(); ctx.ellipse(osc * 0.3, -36, 3, 4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }

    function _desenharVelas(ctx, p, t, seed) {
        for (let i = -1; i <= 1; i++) {
            let osc = Math.sin(t * 10 + seed + i * 0.7) * 1.2;
            ctx.fillStyle = '#d4c99a';
            ctx.fillRect(i * 7 - 2, 0, 4, 12);
            ctx.strokeStyle = '#555'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(i * 7, 0); ctx.lineTo(i * 7, -3); ctx.stroke();
            ctx.save(); ctx.globalAlpha = 0.9;
            ctx.fillStyle = '#ff9900';
            ctx.beginPath(); ctx.moveTo(i * 7 - 2, -3); ctx.quadraticCurveTo(osc + i * 7 - 1, -8, i * 7, -12); ctx.quadraticCurveTo(osc + i * 7 + 1, -8, i * 7 + 2, -3); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#ffee88';
            ctx.beginPath(); ctx.arc(osc * 0.5 + i * 7, -7, 1, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        }
    }

    // ------- Decor -------
    function _desenharDecor(ctx, d, t) {
        if (d.tipo === 'tapete') {
            let grd = ctx.createLinearGradient(d.x, d.y, d.x + d.w, d.y + d.h);
            grd.addColorStop(0, '#8b1a1a'); grd.addColorStop(0.5, '#a52020'); grd.addColorStop(1, '#8b1a1a');
            ctx.fillStyle = grd;
            ctx.fillRect(d.x, d.y, d.w, d.h);
            ctx.strokeStyle = '#c8a000'; ctx.lineWidth = 2;
            ctx.strokeRect(d.x + 2, d.y + 2, d.w - 4, d.h - 4);
            ctx.fillStyle = 'rgba(200,160,0,0.18)';
            for (let i = 0; i < 3; i++) {
                ctx.beginPath(); ctx.arc(d.x + d.w / 2, d.y + d.h / 2 + i * 36 - 36, 9, 0, Math.PI * 2); ctx.fill();
            }
            return;
        }
        if (d.tipo === 'runa_piso') {
            ctx.save();
            ctx.globalAlpha = 0.28 + Math.sin(t * 1.8) * 0.13;
            ctx.strokeStyle = '#cc3300'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2); ctx.stroke();
            ctx.beginPath(); ctx.arc(d.x, d.y, d.r * 0.55, 0, Math.PI * 2); ctx.stroke();
            for (let i = 0; i < 8; i++) {
                let ang = (i / 8) * Math.PI * 2;
                ctx.beginPath();
                ctx.moveTo(d.x + Math.cos(ang) * d.r * 0.55, d.y + Math.sin(ang) * d.r * 0.55);
                ctx.lineTo(d.x + Math.cos(ang) * d.r, d.y + Math.sin(ang) * d.r);
                ctx.stroke();
            }
            ctx.restore();
            return;
        }
        if (d.tipo === 'mosaico_arena') {
            ctx.save();
            ctx.globalAlpha = 0.22;
            ctx.strokeStyle = '#c8a030'; ctx.lineWidth = 1.5;
            for (let ring = 1; ring <= 5; ring++) {
                ctx.beginPath(); ctx.arc(d.x, d.y, (d.r / 5) * ring, 0, Math.PI * 2); ctx.stroke();
            }
            for (let i = 0; i < 16; i++) {
                let ang = (i / 16) * Math.PI * 2;
                ctx.beginPath();
                ctx.moveTo(d.x + Math.cos(ang) * 20, d.y + Math.sin(ang) * 20);
                ctx.lineTo(d.x + Math.cos(ang) * d.r, d.y + Math.sin(ang) * d.r);
                ctx.stroke();
            }
            ctx.fillStyle = '#c8a030';
            ctx.beginPath();
            for (let i = 0; i < 8; i++) {
                let ang = (i / 8) * Math.PI * 2;
                let r2 = i % 2 === 0 ? 20 : 9;
                if (i === 0) ctx.moveTo(d.x + Math.cos(ang) * r2, d.y + Math.sin(ang) * r2);
                else ctx.lineTo(d.x + Math.cos(ang) * r2, d.y + Math.sin(ang) * r2);
            }
            ctx.closePath(); ctx.fill();
            ctx.restore();
            return;
        }
        if (d.tipo === 'teia') {
            ctx.save(); ctx.globalAlpha = 0.42;
            ctx.strokeStyle = 'rgba(200,190,170,0.7)'; ctx.lineWidth = 0.5;
            for (let i = 0; i < 8; i++) {
                let ang = (i / 8) * Math.PI * 2;
                ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x + Math.cos(ang) * d.r, d.y + Math.sin(ang) * d.r); ctx.stroke();
            }
            for (let ring = 1; ring <= 4; ring++) {
                ctx.beginPath(); ctx.arc(d.x, d.y, (d.r / 4) * ring, 0, Math.PI * 2); ctx.stroke();
            }
            ctx.restore();
            return;
        }
        // Decor genérico
        if (d.tipo === 'osso') {
            ctx.fillStyle = 'rgba(175,165,140,0.38)';
            ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(d.ang || 0);
            ctx.fillRect(-d.r * 2, -1, d.r * 4, 2.5);
            ctx.beginPath(); ctx.arc(-d.r * 2, 0, 2.5, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(d.r * 2, 0, 2.5, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        } else if (d.tipo === 'mancha') {
            ctx.fillStyle = 'rgba(80,5,10,0.28)';
            ctx.save(); ctx.translate(d.x, d.y);
            ctx.beginPath(); ctx.ellipse(0, 0, d.r * 2, d.r * 0.8, d.ang || 0, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        } else if (d.tipo === 'musgo') {
            ctx.fillStyle = 'rgba(25,55,18,0.3)';
            ctx.save(); ctx.translate(d.x, d.y);
            ctx.beginPath(); ctx.ellipse(0, 0, d.r * 2, d.r, d.ang || 0, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        } else if (d.tipo !== 'po') {
            ctx.fillStyle = 'rgba(50,42,30,0.25)';
            ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2); ctx.fill();
        }
    }

    // ------- Corrente -------
    function _desenharCorrente(ctx, cr, t) {
        ctx.save();
        ctx.strokeStyle = '#504030'; ctx.lineWidth = 2;
        let osc = Math.sin(t * 2.5 + cr.seed * 0.08) * 4;
        let links = Math.floor(cr.comp / 7);
        for (let i = 0; i < links; i++) {
            let py = cr.y + i * 7;
            let px = cr.x + Math.sin(i * 0.8 + t * 1.8 + cr.seed * 0.05) * osc;
            ctx.strokeStyle = i % 2 === 0 ? '#504030' : '#6a5040';
            ctx.beginPath();
            ctx.ellipse(px, py + 3, 2.5, 3.5, i % 2 === 0 ? 0 : Math.PI / 2, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.fillStyle = '#705040';
        ctx.beginPath(); ctx.arc(cr.x, cr.y, 4, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }

    // ------- Névoa -------
    function _desenharNevoa(ctx, camX, camY, cw, ch, t) {
        let fogZones = [
            { x: CST_X0 + 13 * TILE, y: 4 * TILE, w: 13 * TILE, h: 10 * TILE },  // tortura
            { x: CST_X0 + 27 * TILE, y: 33 * TILE, w: 9 * TILE, h: 9 * TILE },   // correntes
        ];
        ctx.save();
        for (let f of fogZones) {
            if (f.x + f.w < camX || f.x > camX + cw || f.y + f.h < camY || f.y > camY + ch) continue;
            ctx.globalAlpha = 0.06 + Math.sin(t * 0.7) * 0.03;
            ctx.fillStyle = '#9999cc';
            for (let i = 0; i < 5; i++) {
                let ox = Math.sin(t * 0.4 + i * 1.2) * 18;
                let oy = Math.sin(t * 0.3 + i * 0.9) * 10;
                ctx.beginPath();
                ctx.ellipse(f.x + f.w / 2 + ox, f.y + f.h - 18 + oy, f.w * 0.38, 16, 0, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.restore();
    }

    // ------- Vinheta -------
    function _desenharVinheta(ctx, camX, camY, cw, ch) {
        let grd = ctx.createRadialGradient(camX + cw / 2, camY + ch / 2, ch * 0.12, camX + cw / 2, camY + ch / 2, ch * 0.82);
        grd.addColorStop(0, 'rgba(0,0,0,0)');
        grd.addColorStop(1, 'rgba(0,0,0,0.54)');
        ctx.fillStyle = grd;
        ctx.fillRect(camX, camY, cw, ch);
    }

    // ------- Sortables -------
    function coletarCasteloSortables(t, arr) {
        if (!grid) gerarCastelo();
        let camX = global.camX || 0;
        let camY = global.camY || 0;
        let zoom = global.cameraZoomAtual || global.ZOOM_CAMERA || 1;
        let cw = ((global.canvas && global.canvas.width) || 900) / zoom;
        let ch = ((global.canvas && global.canvas.height) || 600) / zoom;
        for (let i = 0; i < sortables.length; i++) {
            let s = sortables[i];
            if (s.x < camX - 200 || s.x > camX + cw + 200 || s.base < camY - 200 || s.base > camY + ch + 40) continue;
            arr.push({
                y: s.base,
                draw: (function (spr, tm) {
                    return function () { _desenharSortable(global.ctx, spr, tm); };
                })(s, t)
            });
        }
    }

    function _desenharSortable(ctx, s, t) {
        if (!ctx) return;
        ctx.save(); ctx.translate(s.x, s.base);
        if (s.tipo === 'pilar')         _pillar(ctx, t, s.c);
        else if (s.tipo === 'coluna')   _coluna(ctx, t, s.c);
        else if (s.tipo === 'trono')    _trono(ctx, t);
        else if (s.tipo === 'gaiola')   _gaiola(ctx, t, s.c);
        else if (s.tipo === 'armadura_pe') _armadura(ctx, t, s.c);
        else if (s.tipo === 'pedestal' || s.tipo === 'pedestal_boss') _pedestal(ctx, t);
        else if (s.tipo === 'altar')    _altar(ctx, t);
        ctx.restore();
    }

    function _pillar(ctx, t, c) {
        ctx.fillStyle = '#2a2218'; ctx.fillRect(-6, -56, 12, 56);
        ctx.fillStyle = '#342c20'; ctx.fillRect(-4, -56, 2, 56); ctx.fillRect(2, -56, 2, 56);
        ctx.fillStyle = '#3a3028'; ctx.fillRect(-8, -8, 16, 8);
        ctx.fillStyle = '#3a3028'; ctx.fillRect(-9, -56, 18, 8);
        ctx.beginPath(); ctx.moveTo(-8, -68); ctx.lineTo(0, -80); ctx.lineTo(8, -68); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(180,140,80,0.1)'; ctx.fillRect(-3, -56, 1, 56);
    }

    function _coluna(ctx, t, c) {
        ctx.fillStyle = '#2e2620'; ctx.fillRect(-7, -72, 14, 72);
        ctx.strokeStyle = 'rgba(90,70,40,0.35)'; ctx.lineWidth = 1;
        for (let i = -5; i <= 5; i += 2) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, -72); ctx.stroke(); }
        ctx.fillStyle = '#3e3428';
        ctx.fillRect(-10, -10, 20, 10); ctx.fillRect(-8, -14, 16, 4);
        ctx.fillRect(-11, -72, 22, 10);
        ctx.fillStyle = '#504030';
        ctx.beginPath(); ctx.arc(-8, -72, 5, 0, Math.PI); ctx.fill();
        ctx.beginPath(); ctx.arc(8, -72, 5, 0, Math.PI); ctx.fill();
        ctx.strokeStyle = 'rgba(200,160,50,0.2)'; ctx.lineWidth = 1;
        ctx.strokeRect(-10, -10, 20, 10);
    }

    function _trono(ctx, t) {
        ctx.fillStyle = '#6a1a1a'; ctx.fillRect(-22, -15, 44, 15);
        ctx.fillStyle = '#8a2a2a'; ctx.fillRect(-20, -13, 40, 11);
        ctx.fillStyle = '#2e2418'; ctx.fillRect(-22, -60, 44, 46);
        ctx.fillStyle = '#3e3428';
        ctx.fillRect(-26, -65, 8, 55); ctx.fillRect(18, -65, 8, 55);
        ctx.fillRect(-24, -68, 48, 8);
        ctx.beginPath(); ctx.moveTo(-8, -68); ctx.lineTo(0, -84); ctx.lineTo(8, -68); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(200,160,30,0.25)';
        ctx.fillRect(-18, -58, 36, 4); ctx.fillRect(-18, -44, 36, 4); ctx.fillRect(-18, -30, 36, 4);
        ctx.strokeStyle = 'rgba(200,160,30,0.35)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(0, -42, 10, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, -52); ctx.lineTo(0, -32); ctx.moveTo(-10, -42); ctx.lineTo(10, -42); ctx.stroke();
        ctx.fillStyle = '#8b1a1a'; ctx.fillRect(-16, -14, 32, 10);
        ctx.fillStyle = 'rgba(180,40,40,0.4)';
        ctx.beginPath(); ctx.ellipse(0, -9, 14, 4, 0, 0, Math.PI * 2); ctx.fill();
    }

    function _gaiola(ctx, t, c) {
        let bal = Math.sin(t * 1.2 + c * 0.8) * 3;
        ctx.save(); ctx.rotate(bal * Math.PI / 180);
        ctx.strokeStyle = '#5a4530'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, -55); ctx.lineTo(0, -40); ctx.stroke();
        ctx.strokeStyle = '#4a3828'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(0, -22, 16, 8, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(0, -38, 16, 8, 0, 0, Math.PI * 2); ctx.stroke();
        for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * 6, -38); ctx.lineTo(i * 6, -22); ctx.stroke(); }
        ctx.restore();
    }

    function _armadura(ctx, t, c) {
        ctx.fillStyle = '#505050'; ctx.fillRect(-5, -20, 4, 22); ctx.fillRect(1, -20, 4, 22);
        ctx.fillStyle = '#686868'; ctx.fillRect(-8, -44, 16, 24);
        ctx.fillStyle = '#585858';
        ctx.beginPath(); ctx.ellipse(-10, -38, 6, 5, -0.3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(10, -38, 6, 5, 0.3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#606060'; ctx.beginPath(); ctx.arc(0, -52, 10, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#505050'; ctx.fillRect(-7, -55, 14, 6);
        ctx.fillStyle = 'rgba(200,200,220,0.18)'; ctx.fillRect(-4, -44, 2, 24); ctx.beginPath(); ctx.arc(-2, -52, 3, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#8a7a5a'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(12, -60); ctx.stroke();
        ctx.fillStyle = '#aaa'; ctx.beginPath(); ctx.moveTo(10, -60); ctx.lineTo(12, -70); ctx.lineTo(14, -60); ctx.fill();
    }

    function _pedestal(ctx, t) {
        ctx.fillStyle = '#2e2820'; ctx.fillRect(-12, -22, 24, 22);
        ctx.fillStyle = '#3e3828'; ctx.fillRect(-14, -26, 28, 6);
        ctx.fillStyle = '#2a2418'; ctx.fillRect(-10, -4, 20, 4);
        ctx.fillStyle = '#c8a020';
        ctx.beginPath(); ctx.arc(0, -30, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#e0b830'; ctx.beginPath(); ctx.arc(0, -30, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#c8a020'; ctx.fillRect(-2, -40, 4, 10); ctx.fillRect(-7, -42, 14, 4);
    }

    function _altar(ctx, t) {
        let p = 0.5 + Math.sin(t * 1.8) * 0.3;
        ctx.fillStyle = '#2a2418'; ctx.fillRect(-26, -6, 52, 6);
        ctx.fillStyle = '#322c1e'; ctx.fillRect(-22, -12, 44, 8);
        ctx.fillStyle = '#3a3428'; ctx.fillRect(-18, -20, 36, 10);
        ctx.fillStyle = '#423c2e'; ctx.fillRect(-20, -26, 40, 8);
        ctx.strokeStyle = 'rgba(200,160,30,0.6)'; ctx.lineWidth = 1.5;
        ctx.strokeRect(-19, -25, 38, 6);
        ctx.save();
        ctx.globalAlpha = 0.35 + p * 0.35;
        ctx.fillStyle = '#cc3300';
        for (let i = 0; i < 6; i++) {
            let ang = (i / 6) * Math.PI * 2;
            ctx.beginPath();
            ctx.arc(Math.cos(ang) * 8, -22 + Math.sin(ang) * 3, 2, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
        ctx.strokeStyle = '#504030'; ctx.lineWidth = 1.5;
        for (let side of [-18, 18]) {
            ctx.beginPath(); ctx.moveTo(side, -22);
            for (let i = 0; i < 5; i++) ctx.lineTo(side + Math.sin(i * 1.2 + t) * 3, -22 + i * 5 + 5);
            ctx.stroke();
        }
    }

    // ------- Portais -------
    function _vortexCastelo(ctx, x, y, t, cor1, cor2) {
        ctx.save();
        ctx.shadowColor = cor1; ctx.shadowBlur = 22;
        ctx.fillStyle = 'rgba(5,3,10,0.65)';
        ctx.beginPath(); ctx.arc(x, y, 50, 0, Math.PI * 2); ctx.fill();
        for (let i = 0; i < 6; i++) {
            let rr = 14 + i * 7;
            let a0 = t * 1.3 + i * 1.1;
            ctx.globalAlpha = 0.8;
            ctx.strokeStyle = i % 2 === 0 ? cor1 : cor2;
            ctx.lineWidth = 2.5;
            ctx.beginPath(); ctx.arc(x, y, rr, a0, a0 + Math.PI * 0.85); ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.fillStyle = cor1;
        ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }

    function desenharPortalCasteloEntrada(t) {
        const ctx = global.ctx;
        if (ctx) _vortexCastelo(ctx, PORTAL_ZONAZERO_ENTRADA.x, PORTAL_ZONAZERO_ENTRADA.y, t, '#c8a020', '#ff6600');
    }
    function desenharPortalCasteloSaida(t) {
        const ctx = global.ctx;
        if (ctx) _vortexCastelo(ctx, PORTAL_CASTELO_SAIDA.x, PORTAL_CASTELO_SAIDA.y, t, '#4a9eaf', '#2255cc');
    }

    // ---------- Chain ----------
    let castleChainAnterior = null;
    let transicaoAtiva = false;

    function onUpdatePosicao(x, y) {
        if (transicaoAtiva || global.estaMorto) return;
        if (typeof global.portalMapaPodeDisparar === 'function' && !global.portalMapaPodeDisparar(x, y)) return;

        let info = null;
        if (isCastelo(x, y)) {
            info = infoPortalCastelo(x, y);
        }
        if (!info && x >= (global.LARGURA_ZONA_ZERO || 74000) && x < CST_X0) {
            info = infoPortalCastelo(x, y);
        }
        if (!info && castleChainAnterior && typeof castleChainAnterior.onUpdatePosicao === 'function') {
            castleChainAnterior.onUpdatePosicao(x, y); return;
        }
        if (!info) return;
        if (typeof global.solicitarTeleporteMapa === 'function') {
            global.solicitarTeleporteMapa(info.mapa, 'castelo_' + info.mapa); return;
        }
        transicaoAtiva = true;
        setTimeout(function () {
            global.meuX = info.alvo.x; global.meuY = info.alvo.y; transicaoAtiva = false;
        }, 380);
    }

    function resetarCastelo() { grid = null; sortables = []; decor = []; luzes = []; correntes = []; }

    function depositarPosicaoSegura(x0, y0) {
        if (!colideCastelo(x0, y0)) return { x: x0, y: y0 };
        for (let r = 1; r <= 5; r++) {
            for (let a = 0; a < 8; a++) {
                let ang = (a / 8) * Math.PI * 2;
                let x = x0 + Math.cos(ang) * r * TILE, y = y0 + Math.sin(ang) * r * TILE;
                if (!colideCastelo(x, y)) return { x, y };
            }
        }
        return { x: SPAWN_CASTELO.x, y: SPAWN_CASTELO.y };
    }

    // ---------- API ----------
    const api = {
        TILE, COLS, ROWS, CST_X0, CST_X1, CST_Y1,
        ALT_LIVRE, ALT_PEQUENA, ALT_MEDIA, ALT_ALTA,
        PORTAL_ZONAZERO_ENTRADA, PORTAL_CASTELO_SAIDA, SPAWN_CASTELO,
        gerarCastelo, resetarCastelo,
        grid: function () { return grid; },
        isCastelo, colideCastelo, colideProjetilCastelo,
        infoPortalCastelo, depositarPosicaoSegura,
        desenharCenarioCastelo, coletarCasteloSortables,
        desenharPortalCasteloEntrada, desenharPortalCasteloSaida,
        luzes: function () { return luzes; },
        sortables: function () { return sortables; }
    };

    // ---------- Browser ----------
    if (global.window) {
        gerarCastelo();
        castleChainAnterior = global.chainMapas;
        global.chainMapas = { onUpdatePosicao: onUpdatePosicao };
        global.desenharCenarioCastelo = desenharCenarioCastelo;
        global.coletarCasteloSortables = coletarCasteloSortables;
        global.colideCastelo = colideCastelo;
        global.colideProjetilCastelo = colideProjetilCastelo;
        global.desenharPortalCasteloEntrada = desenharPortalCasteloEntrada;
        global.desenharPortalCasteloSaida = desenharPortalCasteloSaida;
        global.mapaCastelo = api;
        global.LARGURA_CASTELO = CST_X0;
        global.FIM_CASTELO = CST_X1;
        global.ALTO_CASTELO = CST_Y1;

        const _prevColide = global.colideMapaAtivo;
        global.colideMapaAtivo = function (x, y, raio) {
            if (isCastelo(x, y)) return colideCastelo(x, y);
            return typeof _prevColide === 'function' ? _prevColide(x, y, raio) : false;
        };
        const _prevColideP = global.colideProjetilMapaAtivo;
        global.colideProjetilMapaAtivo = function (x, y) {
            if (isCastelo(x, y)) return colideProjetilCastelo(x, y);
            return typeof _prevColideP === 'function' ? _prevColideP(x, y) : false;
        };
    }

    // ---------- Node ----------
    if (typeof module !== 'undefined' && module.exports) {
        if (!grid) gerarCastelo();
        module.exports = api;
    }

})(typeof window !== 'undefined' ? window : this);
