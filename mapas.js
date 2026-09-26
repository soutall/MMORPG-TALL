// mapas.js — Campo Verde (Fase 1: Nova Geração com Autotiling, Z-Sorting, Iluminação Dinâmica e Lagos Vivos)
// Módulo isomórfico: funciona no navegador (window) e no servidor Node.js (module.exports).
// ============================================================================
(function (global) {
    'use strict';

    const TILE = 40;
    const LARGURA_VERDE = 18000;
    const ALTO_VERDE = 5400;
    const COLS = 450; // 18000 / 40
    const ROWS = 135; // 5400 / 40

    const ALT_LIVRE = 0;
    const ALT_PAREDE = 3;

    // Constantes legadas preservadas para compatibilidade
    global.SAFE_X = 5000;
    global.SAFE_Y = 1200;
    global.SAFE_RAIO = 350;

    // Portais dentro do mapa verde
    const PORTAL_CIDADE = { x: 5000, y: 1200, r: 58 };
    const PORTAL_CAVERNA = { x: 1400, y: 1400, r: 58 };
    const PORTAL_DESERTO = { x: 17080, y: 4500, r: 58 };

    // 5 Acampamentos Temáticos espalhados pelo mapa
    const ACAMPAMENTOS = [
        { id: 'aprendizes', nome: 'Posto dos Aprendizes', x: 1800, y: 1100, r: 180, fogueira: { x: 1800, y: 1100, r: 24 } },
        { id: 'sagrada', nome: 'Praça Sagrada de Davahl', x: 5000, y: 1200, r: 350, fogueira: { x: 5160, y: 1080, r: 24 } },
        { id: 'cacadores', nome: 'Refúgio dos Caçadores', x: 8400, y: 1800, r: 200, fogueira: { x: 8400, y: 1800, r: 24 } },
        { id: 'exploradores', nome: 'Vila dos Exploradores', x: 11800, y: 2400, r: 220, fogueira: { x: 11800, y: 2400, r: 24 } },
        { id: 'fronteira', nome: 'Posto Avançado da Fronteira', x: 16200, y: 4300, r: 210, fogueira: { x: 16200, y: 4300, r: 24 } }
    ];

    // 5 Lagos Vivos e Naturais
    const LAGOS = [
        { id: 'lotus', nome: 'Lago dos Lótus', cx: 2800, cy: 850, rx: 280, ry: 210 },
        { id: 'sereno', nome: 'Lago Sereno', cx: 3200, cy: 3800, rx: 340, ry: 260 },
        { id: 'central', nome: 'Grande Lago da Floresta', cx: 7600, cy: 3800, rx: 420, ry: 300 },
        { id: 'reflexos', nome: 'Lago dos Reflexos', cx: 12600, cy: 1300, rx: 320, ry: 230 },
        { id: 'rochas', nome: 'Lago da Fronteira', cx: 14600, cy: 3900, rx: 350, ry: 250 }
    ];

    let grid = null;
    let arvores = [];

    // Gerador Pseudoaleatório Determinístico (mulberry32)
    function mulberry32(seed) {
        return function () {
            seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
            let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    function hash2(x, y, s) {
        let n = (x * 374761393 + y * 668265263 + (s || 0)) | 0;
        n = Math.imul(n ^ (n >>> 13), 1274126177);
        return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
    }

    function pontoNaEstrada(wx, wy) {
        // 1. Estrada Principal Oeste -> Leste (da Caverna x=1400 à Praça x=5000)
        if (wx >= 1200 && wx <= 5200) {
            const yIdeal = 1400 - ((wx - 1200) / 4000) * 200; // 1400 -> 1200
            if (Math.abs(wy - yIdeal) < 70) return true;
        }
        // 2. Estrada Praça x=5000 -> Caçadores x=8400
        if (wx >= 4900 && wx <= 8600) {
            const prog = (wx - 4900) / 3700;
            const yIdeal = 1200 + prog * 600; // 1200 -> 1800
            if (Math.abs(wy - yIdeal) < 75) return true;
        }
        // 3. Estrada Caçadores x=8400 -> Exploradores x=11800
        if (wx >= 8300 && wx <= 12000) {
            const prog = (wx - 8300) / 3700;
            const yIdeal = 1800 + prog * 600; // 1800 -> 2400
            if (Math.abs(wy - yIdeal) < 75) return true;
        }
        // 4. Estrada Exploradores x=11800 -> Fronteira/Deserto x=17100
        if (wx >= 11700 && wx <= 17200) {
            const prog = (wx - 11700) / 5500;
            const yIdeal = 2400 + prog * 2100; // 2400 -> 4500
            if (Math.abs(wy - yIdeal) < 80) return true;
        }
        return false;
    }

    function obterDistanciaLago(wx, wy) {
        for (let i = 0; i < LAGOS.length; i++) {
            const l = LAGOS[i];
            const dx = (wx - l.cx) / l.rx;
            const dy = (wy - l.cy) / l.ry;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist <= 1.25) {
                return { lago: l, dist: dist };
            }
        }
        return null;
    }

    function obterAcampamento(wx, wy) {
        for (let i = 0; i < ACAMPAMENTOS.length; i++) {
            const a = ACAMPAMENTOS[i];
            if (Math.hypot(wx - a.x, wy - a.y) <= a.r) return a;
        }
        return null;
    }

    function gerarGrid() {
        if (grid) return grid;

        const rnd = mulberry32(20260925);
        grid = [];

        // 1. GERAÇÃO BASE DOS TILES
        for (let l = 0; l < ROWS; l++) {
            const row = [];
            const wy = l * TILE + 20;

            for (let c = 0; c < COLS; c++) {
                const wx = c * TILE + 20;
                let tipo = 'grama';
                let alt = ALT_LIVRE;

                // A. Paredões perimetrais de pedra/falésia
                // Borda Norte (l=0,1), Borda Sul (l >= ROWS-2), Borda Oeste (c=0,1)
                const bordaNorte = (l <= 1);
                const bordaSul = (l >= ROWS - 2);
                const bordaOeste = (c <= 1);
                // Borda Leste (c >= COLS-2), EXCETO na passagem do Deserto (l entre 108 e 116 -> Y 4320 a 4640)
                const passagemDeserto = (l >= 108 && l <= 116);
                const bordaLeste = (c >= COLS - 2 && !passagemDeserto);

                if (bordaNorte || bordaSul || bordaOeste || bordaLeste) {
                    tipo = 'muro';
                    alt = ALT_PAREDE;
                }
                // B. Lagos Vivos
                else {
                    const infoLago = obterDistanciaLago(wx, wy);
                    if (infoLago) {
                        if (infoLago.dist < 0.65) {
                            tipo = 'agua_funda';
                            alt = ALT_PAREDE; // água impede caminhada
                        } else if (infoLago.dist < 0.95) {
                            tipo = 'agua_rasa';
                            alt = ALT_PAREDE; // margem rasa
                        } else {
                            tipo = 'areia';
                            alt = ALT_LIVRE; // praia arenosa caminhável
                        }
                    }
                    // C. Acampamentos e Praças de Pedra
                    else {
                        const acamp = obterAcampamento(wx, wy);
                        if (acamp) {
                            tipo = 'caminho';
                            alt = ALT_LIVRE;
                        } else if (pontoNaEstrada(wx, wy)) {
                            tipo = 'caminho';
                            alt = ALT_LIVRE;
                        } else {
                            // Solo comum de grama com variações
                            const hSolo = hash2(c, l, 7);
                            if (hSolo > 0.85) tipo = 'grama_clara';
                            else if (hSolo < 0.08) tipo = 'flor';
                        }
                    }
                }

                row.push({ tipo: tipo, alt: alt, autotileMask: 0 });
            }
            grid.push(row);
        }

        // 2. CALCULAR BITMASKS DE AUTOTILING (4-Bit: N=1, L=2, S=4, O=8)
        for (let l = 0; l < ROWS; l++) {
            for (let c = 0; c < COLS; c++) {
                const tipo = grid[l][c].tipo;
                let mask = 0;
                if (l > 0 && grid[l - 1][c].tipo === tipo) mask |= 1;
                if (c < COLS - 1 && grid[l][c + 1].tipo === tipo) mask |= 2;
                if (l < ROWS - 1 && grid[l + 1][c].tipo === tipo) mask |= 4;
                if (c > 0 && grid[l][c - 1].tipo === tipo) mask |= 8;
                grid[l][c].autotileMask = mask;
            }
        }

        // 3. GERAÇÃO DETERMINÍSTICA DE ÁRVORES FRONDOSAS COM Z-SORTING
        arvores = [];
        let tentativas = 0;
        const maxArvores = 210;

        while (arvores.length < maxArvores && tentativas < 50000) {
            tentativas++;
            const tx = 140 + rnd() * (LARGURA_VERDE - 280);
            const ty = 140 + rnd() * (ALTO_VERDE - 280);

            // Não spawnar dentro ou perto da estrada
            if (pontoNaEstrada(tx, ty)) continue;

            // Não spawnar em acampamentos
            let emAcamp = false;
            for (let ai = 0; ai < ACAMPAMENTOS.length; ai++) {
                if (Math.hypot(tx - ACAMPAMENTOS[ai].x, ty - ACAMPAMENTOS[ai].y) < ACAMPAMENTOS[ai].r + 60) {
                    emAcamp = true; break;
                }
            }
            if (emAcamp) continue;

            // Não spawnar em lagos
            const lInfo = obterDistanciaLago(tx, ty);
            if (lInfo && lInfo.dist < 1.3) continue;

            // Não spawnar nos portais
            if (Math.hypot(tx - PORTAL_CIDADE.x, ty - PORTAL_CIDADE.y) < 180) continue;
            if (Math.hypot(tx - PORTAL_CAVERNA.x, ty - PORTAL_CAVERNA.y) < 180) continue;
            if (Math.hypot(tx - PORTAL_DESERTO.x, ty - PORTAL_DESERTO.y) < 220) continue;

            // Não colidir com outras árvores (distância mínima)
            let pertoOutra = false;
            for (let k = 0; k < arvores.length; k++) {
                if (Math.hypot(arvores[k].x - tx, arvores[k].y - ty) < 170) {
                    pertoOutra = true; break;
                }
            }
            if (pertoOutra) continue;

            const seed = hash2(Math.floor(tx), Math.floor(ty), 42);
            arvores.push({
                x: tx,
                y: ty,
                rCol: 22,
                raioColisao: 22, // retrocompatibilidade com index.html
                raioCopa: 48 + Math.floor(seed * 12),
                seed: seed * 10
            });
        }

        global.arvores = arvores;
        return grid;
    }

    function isVerde(x, y) {
        return x >= 0 && x < LARGURA_VERDE && y >= 0 && y < ALTO_VERDE;
    }

    function colideVerde(x, y, raio) {
        if (!isVerde(x, y)) return true;
        if (!grid) gerarGrid();
        raio = Number(raio) || 12;

        // Limites perimetrais rígidos
        // Permite passagem no portão leste para o deserto em Y: 4320 a 4640
        const naAberturaDeserto = (x >= LARGURA_VERDE - 80 && y >= 4320 && y <= 4640);
        if (!naAberturaDeserto) {
            if (x - raio < 60 || x + raio >= LARGURA_VERDE - 60 || y - raio < 60 || y + raio >= ALTO_VERDE - 60) {
                return true;
            }
        }

        // Colisão com os tiles da grade (muralhas e águas profundas dos lagos)
        const c0 = Math.max(0, Math.floor((x - raio) / TILE));
        const c1 = Math.min(COLS - 1, Math.floor((x + raio) / TILE));
        const l0 = Math.max(0, Math.floor((y - raio) / TILE));
        const l1 = Math.min(ROWS - 1, Math.floor((y + raio) / TILE));

        for (let l = l0; l <= l1; l++) {
            for (let c = c0; c <= c1; c++) {
                if (grid[l][c].alt >= ALT_PAREDE) return true;
            }
        }

        // Colisão física com os troncos das árvores
        for (let i = 0; i < arvores.length; i++) {
            const a = arvores[i];
            if (Math.hypot(x - a.x, y - a.y) < (a.rCol + raio)) return true;
        }

        // Colisão com as fogueiras dos acampamentos
        for (let j = 0; j < ACAMPAMENTOS.length; j++) {
            const fog = ACAMPAMENTOS[j].fogueira;
            if (fog && Math.hypot(x - fog.x, y - fog.y) < (fog.r + raio)) return true;
        }

        return false;
    }

    function colideProjetilVerde(x, y) {
        if (!isVerde(x, y)) return true;
        if (!grid) gerarGrid();
        const c = Math.floor(x / TILE);
        const l = Math.floor(y / TILE);
        if (c < 0 || c >= COLS || l < 0 || l >= ROWS) return true;
        if (grid[l][c].tipo === 'muro') return true;

        for (let i = 0; i < arvores.length; i++) {
            const a = arvores[i];
            if (Math.hypot(x - a.x, y - a.y) < a.rCol) return true;
        }
        return false;
    }

    // ========================================================================
    // RENDERIZAÇÃO CLIENT-SIDE (HTML5 Canvas com Frustum Culling e Z-Sorting)
    // ========================================================================

    // Partículas de folhas ao vento na tela do jogador (Viewport Aware)
    const FOLHAS = [];
    for (let fi = 0; fi < 32; fi++) {
        FOLHAS.push({
            rx: Math.random(), // relativo à viewport [0, 1]
            ry: Math.random(),
            vx: 0.7 + Math.random() * 0.9,
            vy: 0.3 + Math.random() * 0.6,
            ang: Math.random() * Math.PI * 2,
            vAng: 0.02 + Math.random() * 0.04,
            cor: fi % 2 === 0 ? '#48bb78' : (fi % 3 === 0 ? '#ecc94b' : '#38a169'),
            tam: 3.2 + Math.random() * 2.8
        });
    }

    // Faíscas das fogueiras
    const FAISCAS = [];
    for (let fsi = 0; fsi < 12; fsi++) {
        FAISCAS.push({
            dx: (Math.random() * 14 - 7),
            dy: (Math.random() * 8 - 4),
            vy: 0.8 + Math.random() * 1.2,
            vx: (Math.random() * 0.6 - 0.3),
            vida: Math.random() * 1.5,
            vidaMax: 1.5
        });
    }

    function desenharCenario(tempoAnimacao) {
        const ctx = global.ctx;
        if (!ctx) return;
        if (!grid) gerarGrid();

        const t = (typeof tempoAnimacao === 'number') ? tempoAnimacao : (Date.now() / 1000);
        const camX = global.camX || 0, camY = global.camY || 0;
        const cw = ((global.canvas && global.canvas.width) || 900) / (global.ZOOM_CAMERA || 1);
        const ch = ((global.canvas && global.canvas.height) || 600) / (global.ZOOM_CAMERA || 1);

        // Frustum culling: renderizar somente os tiles visíveis na câmera
        const c0 = Math.max(0, Math.floor((camX - 60) / TILE));
        const c1 = Math.min(COLS - 1, Math.ceil((camX + cw + 60) / TILE));
        const l0 = Math.max(0, Math.floor((camY - 60) / TILE));
        const l1 = Math.min(ROWS - 1, Math.ceil((camY + ch + 60) / TILE));

        // 1. DESENHO DOS TILES DO SOLO (com autotiling e relevo)
        for (let l = l0; l <= l1; l++) {
            for (let c = c0; c <= c1; c++) {
                const cel = grid[l][c];
                const x = c * TILE;
                const y = l * TILE;
                desenharTileSolo(ctx, x, y, c, l, cel, t);
            }
        }

        // 2. DESENHO DA PRAÇA SAGRADA DE DAVAHL (Piso Central e Runas)
        desenharPracaCentralDavahl(ctx, t, camX, camY, cw, ch);

        // 3. DESENHO DOS LAGOS VIVOS
        desenharLagosVivos(ctx, t, camX, camY, cw, ch);

        // 4. DESENHO DOS ACAMPAMENTOS E FOGUEIRAS COM ILUMINAÇÃO DINÂMICA
        desenharAcampamentosEFogueiras(ctx, t, camX, camY, cw, ch);

        // 5. PARTÍCULAS AMBIENTES (folhas caindo na brisa por todo o mapa)
        desenharParticulasAmbiente(ctx, t, camX, camY, cw, ch);
    }

    function desenharTileSolo(ctx, x, y, c, l, cel, t) {
        const tipo = cel.tipo;

        // Paredões rochosos e falésias perimetrais
        if (tipo === 'muro') {
            ctx.fillStyle = '#2d3748';
            ctx.fillRect(x, y, TILE, TILE);
            ctx.fillStyle = '#1a202c';
            ctx.fillRect(x, y + TILE - 8, TILE, 8);
            ctx.fillStyle = '#4a5568';
            ctx.fillRect(x + 2, y + 2, TILE - 4, 6);
            if (hash2(c, l, 77) > 0.45) {
                ctx.fillStyle = '#2f855a';
                ctx.fillRect(x + 4, y + 8, 12, 5);
            }
            return;
        }

        // Fundo padrão: Grama verde viçosa
        const tomGrama = (tipo === 'grama_clara') ? '#276749' : (hash2(c, l, 12) > 0.5 ? '#1f4e38' : '#235940');
        ctx.fillStyle = tomGrama;
        ctx.fillRect(x, y, TILE, TILE);

        // Textura orgânica de lâminas de grama
        const hGrama = hash2(c, l, 33);
        if (hGrama > 0.4) {
            ctx.fillStyle = '#2d7a54';
            ctx.fillRect(x + 6, y + 8, 2, 6);
            ctx.fillRect(x + 8, y + 6, 2, 8);
            ctx.fillRect(x + 22, y + 20, 2, 7);
            ctx.fillRect(x + 25, y + 18, 2, 9);
        }

        // Flores silvestres e trevos
        if (tipo === 'flor' || hGrama > 0.88) {
            const hFlor = hash2(c, l, 88);
            if (hFlor > 0.6) {
                ctx.fillStyle = hFlor > 0.8 ? '#ecc94b' : '#ed8936';
                ctx.beginPath(); ctx.arc(x + 18, y + 18, 3, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#ffffff';
                ctx.beginPath(); ctx.arc(x + 18, y + 18, 1.2, 0, Math.PI * 2); ctx.fill();
            } else {
                ctx.fillStyle = '#48bb78';
                ctx.beginPath();
                ctx.arc(x + 12, y + 22, 2.5, 0, Math.PI * 2);
                ctx.arc(x + 16, y + 22, 2.5, 0, Math.PI * 2);
                ctx.arc(x + 14, y + 19, 2.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Areia de praia nos lagos
        if (tipo === 'areia') {
            ctx.fillStyle = '#d69e2e';
            ctx.fillRect(x, y, TILE, TILE);
            ctx.fillStyle = '#b7791f';
            ctx.fillRect(x + 8, y + 12, 3, 2);
            ctx.fillRect(x + 24, y + 22, 2, 2);
            desenharBordasAutotile(ctx, x, y, cel.autotileMask, '#1f4e38');
        }

        // Caminhos de terra batida e pedras
        if (tipo === 'caminho') {
            ctx.fillStyle = '#653c1b';
            ctx.fillRect(x, y, TILE, TILE);

            // Detalhe de calçamento suave
            ctx.fillStyle = '#55606d';
            desenharPedraCalcada(ctx, x + 4, y + 4, 14, 12);
            desenharPedraCalcada(ctx, x + 20, y + 5, 15, 11);
            desenharPedraCalcada(ctx, x + 6, y + 20, 13, 14);
            desenharPedraCalcada(ctx, x + 22, y + 21, 14, 13);

            desenharBordasAutotile(ctx, x, y, cel.autotileMask, '#1f4e38');
        }
    }

    function desenharPedraCalcada(ctx, px, py, pw, ph) {
        ctx.fillStyle = '#4a5568';
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(px, py, pw, ph, 3);
        else ctx.rect(px, py, pw, ph);
        ctx.fill();
        ctx.fillStyle = '#8a9ba8';
        ctx.fillRect(px + 2, py + 1, pw - 4, 2);
    }

    function desenharBordasAutotile(ctx, x, y, mask, corVizinho) {
        if ((mask & 1) === 0) {
            ctx.fillStyle = corVizinho;
            ctx.fillRect(x, y, TILE, 4);
            ctx.fillStyle = 'rgba(0,0,0,0.22)';
            ctx.fillRect(x, y + 4, TILE, 2);
        }
        if ((mask & 2) === 0) {
            ctx.fillStyle = corVizinho;
            ctx.fillRect(x + TILE - 4, y, 4, TILE);
            ctx.fillStyle = 'rgba(0,0,0,0.22)';
            ctx.fillRect(x + TILE - 6, y, 2, TILE);
        }
        if ((mask & 4) === 0) {
            ctx.fillStyle = corVizinho;
            ctx.fillRect(x, y + TILE - 4, TILE, 4);
        }
        if ((mask & 8) === 0) {
            ctx.fillStyle = corVizinho;
            ctx.fillRect(x, y, 4, TILE);
            ctx.fillStyle = 'rgba(0,0,0,0.22)';
            ctx.fillRect(x + 4, y, 2, TILE);
        }
    }

    function desenharPracaCentralDavahl(ctx, t, camX, camY, cw, ch) {
        const px = global.SAFE_X, py = global.SAFE_Y, pr = global.SAFE_RAIO;
        if (px + pr < camX || px - pr > camX + cw || py + pr < camY || py - pr > camY + ch) return;

        ctx.save();
        // Piso de pedra polida circular
        const gradSafe = ctx.createRadialGradient(px, py, 20, px, py, pr);
        gradSafe.addColorStop(0, '#2c3e50');
        gradSafe.addColorStop(0.7, '#1f2c34');
        gradSafe.addColorStop(1, '#151f28');
        ctx.fillStyle = gradSafe;
        ctx.beginPath();
        ctx.arc(px, py, pr, 0, Math.PI * 2);
        ctx.fill();

        // Anel rúnico pulsante delimitando a Safe Zone
        const pulso = 0.65 + 0.35 * Math.sin(t * 2.5);
        ctx.strokeStyle = 'rgba(241, 196, 15, ' + pulso + ')';
        ctx.lineWidth = 3.5;
        ctx.setLineDash([14, 9]);
        ctx.beginPath();
        ctx.arc(px, py, pr - 4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
    }

    function desenharLagosVivos(ctx, t, camX, camY, cw, ch) {
        for (let i = 0; i < LAGOS.length; i++) {
            const l = LAGOS[i];
            if (l.cx + l.rx + 60 < camX || l.cx - l.rx - 60 > camX + cw ||
                l.cy + l.ry + 60 < camY || l.cy - l.ry - 60 > camY + ch) continue;

            ctx.save();
            // 1. Água rasa translúcida
            const gAguaRasa = ctx.createRadialGradient(l.cx, l.cy, l.rx * 0.3, l.cx, l.cy, l.rx);
            gAguaRasa.addColorStop(0, 'rgba(49, 130, 206, 0.85)');
            gAguaRasa.addColorStop(0.75, 'rgba(56, 178, 172, 0.72)');
            gAguaRasa.addColorStop(1, 'rgba(44, 122, 123, 0.35)');
            ctx.fillStyle = gAguaRasa;
            ctx.beginPath();
            ctx.ellipse(l.cx, l.cy, l.rx * 0.95, l.ry * 0.95, 0, 0, Math.PI * 2);
            ctx.fill();

            // 2. Núcleo azul profundo
            const gAguaFunda = ctx.createRadialGradient(l.cx, l.cy, 15, l.cx, l.cy, l.rx * 0.65);
            gAguaFunda.addColorStop(0, '#1a365d');
            gAguaFunda.addColorStop(1, '#2b6cb0');
            ctx.fillStyle = gAguaFunda;
            ctx.beginPath();
            ctx.ellipse(l.cx, l.cy, l.rx * 0.65, l.ry * 0.65, 0, 0, Math.PI * 2);
            ctx.fill();

            // 3. Marolas animadas
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 1.6;
            for (let oi = 0; oi < 5; oi++) {
                const ondaX = l.cx - l.rx * 0.4 + (oi % 3) * (l.rx * 0.3);
                const ondaY = l.cy - l.ry * 0.4 + oi * (l.ry * 0.18);
                const ondaOffset = Math.sin(t * 2.2 + oi * 1.4) * 6;
                ctx.beginPath();
                ctx.ellipse(ondaX + ondaOffset, ondaY, 20 + oi * 4, 4.5, 0, 0, Math.PI);
                ctx.stroke();
            }

            // 4. Espuma viva pulsante na borda
            const pulsoEspuma = Math.sin(t * 2.8 + i) * 3.5;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.lineWidth = 2.0;
            ctx.setLineDash([12, 10]);
            ctx.beginPath();
            ctx.ellipse(l.cx, l.cy, l.rx * 0.92 + pulsoEspuma, l.ry * 0.92 + pulsoEspuma * 0.7, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);

            // 5. Vitórias-régias com flores de lótus flutuantes
            const regias = [
                { dx: -l.rx * 0.3, dy: -l.ry * 0.25, r: 12 },
                { dx: l.rx * 0.25, dy: l.ry * 0.3, r: 14 },
                { dx: -l.rx * 0.1, dy: l.ry * 0.35, r: 11 }
            ];
            for (let ri = 0; ri < regias.length; ri++) {
                const vr = regias[ri];
                const vx = l.cx + vr.dx;
                const vy = l.cy + vr.dy + Math.sin(t * 2.0 + ri + i) * 1.5;
                ctx.fillStyle = '#2f855a';
                ctx.beginPath();
                ctx.arc(vx, vy, vr.r, 0.3, Math.PI * 2);
                ctx.fill();
                // Flor de lótus
                ctx.fillStyle = '#ed64a6';
                ctx.beginPath();
                ctx.arc(vx + 2, vy - 1, 3.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(vx + 2, vy - 1, 1.2, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
        }
    }

    function desenharAcampamentosEFogueiras(ctx, t, camX, camY, cw, ch) {
        for (let i = 0; i < ACAMPAMENTOS.length; i++) {
            const acamp = ACAMPAMENTOS[i];
            const fog = acamp.fogueira;
            if (!fog) continue;
            if (fog.x + 240 < camX || fog.x - 240 > camX + cw ||
                fog.y + 240 < camY || fog.y - 240 > camY + ch) continue;

            desenharFogueiraCompleta(ctx, fog.x, fog.y, t);
            desenharDecoracaoAcampamento(ctx, acamp, t);
        }
    }

    function desenharDecoracaoAcampamento(ctx, acamp, t) {
        // Toras de madeira para assento ao redor da fogueira
        const fx = acamp.fogueira.x, fy = acamp.fogueira.y;
        ctx.save();
        ctx.fillStyle = '#3e2714';

        // Tora norte
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(fx - 28, fy - 42, 56, 12, 4);
        else ctx.rect(fx - 28, fy - 42, 56, 12);
        ctx.fill();
        ctx.fillStyle = '#5d4037';
        ctx.fillRect(fx - 25, fy - 40, 50, 4);

        // Tora sul
        ctx.fillStyle = '#3e2714';
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(fx - 28, fy + 32, 56, 12, 4);
        else ctx.rect(fx - 28, fy + 32, 56, 12);
        ctx.fill();
        ctx.fillStyle = '#5d4037';
        ctx.fillRect(fx - 25, fy + 34, 50, 4);

        // Placa ou barraca rústica
        ctx.fillStyle = '#4e342e';
        ctx.fillRect(fx + 55, fy - 25, 4, 25);
        ctx.fillStyle = '#795548';
        ctx.fillRect(fx + 40, fy - 35, 34, 14);
        ctx.fillStyle = '#f5f5f5';
        ctx.font = 'bold 9px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(acamp.nome.split(' ')[0], fx + 57, fy - 24);

        ctx.restore();
    }

    function desenharFogueiraCompleta(ctx, fx, fy, t) {
        ctx.save();

        // 1. ILUMINAÇÃO DINÂMICA SUAVE (Glow radial âmbar pulsante)
        const pulsarLuz = 1 + Math.sin(t * 4.5) * 0.08 + Math.cos(t * 7.1) * 0.04;
        const raioLuz = 160 * pulsarLuz;
        const gLuz = ctx.createRadialGradient(fx, fy, 15, fx, fy, raioLuz);
        gLuz.addColorStop(0, 'rgba(255, 170, 50, 0.42)');
        gLuz.addColorStop(0.4, 'rgba(237, 137, 54, 0.22)');
        gLuz.addColorStop(0.8, 'rgba(192, 86, 33, 0.08)');
        gLuz.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = gLuz;
        ctx.beginPath();
        ctx.arc(fx, fy, raioLuz, 0, Math.PI * 2);
        ctx.fill();

        // 2. Anel de pedras cinzentas da fogueira
        const numPedras = 10;
        for (let pi = 0; pi < numPedras; pi++) {
            const ang = (pi / numPedras) * Math.PI * 2;
            const px = fx + Math.cos(ang) * 18;
            const py = fy + Math.sin(ang) * 12;
            ctx.fillStyle = '#4a5568';
            ctx.beginPath();
            ctx.ellipse(px, py, 5, 3.5, ang, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#718096';
            ctx.beginPath();
            ctx.arc(px, py - 1, 1.5, 0, Math.PI * 2);
            ctx.fill();
        }

        // 3. Carvão em brasa
        ctx.fillStyle = '#1a202c';
        ctx.beginPath();
        ctx.ellipse(fx, fy, 13, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#c53030';
        ctx.beginPath();
        ctx.ellipse(fx, fy, 9, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        // 4. Labaredas de fogo dinâmicas
        const flameOffset1 = Math.sin(t * 12) * 2.5;
        const flameOffset2 = Math.cos(t * 15) * 2;

        ctx.fillStyle = '#dd6b20';
        ctx.beginPath();
        ctx.moveTo(fx - 10, fy + 2);
        ctx.quadraticCurveTo(fx - 6 + flameOffset1, fy - 18, fx, fy - 26);
        ctx.quadraticCurveTo(fx + 6 + flameOffset2, fy - 18, fx + 10, fy + 2);
        ctx.fill();

        ctx.fillStyle = '#ed8936';
        ctx.beginPath();
        ctx.moveTo(fx - 7, fy + 1);
        ctx.quadraticCurveTo(fx - 3 - flameOffset2, fy - 14, fx + flameOffset1 * 0.5, fy - 22);
        ctx.quadraticCurveTo(fx + 4, fy - 14, fx + 7, fy + 1);
        ctx.fill();

        ctx.fillStyle = '#f6e05e';
        ctx.beginPath();
        ctx.moveTo(fx - 4, fy);
        ctx.quadraticCurveTo(fx - 2, fy - 10, fx, fy - 15);
        ctx.quadraticCurveTo(fx + 2, fy - 10, fx + 4, fy);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(fx, fy - 4, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // 5. Faíscas e brasas
        for (let fsi = 0; fsi < FAISCAS.length; fsi++) {
            const fs = FAISCAS[fsi];
            const px = fx + fs.dx + Math.sin(t * 4 + fsi) * 2;
            const py = fy + fs.dy - ((t * 25 + fsi * 10) % 55);
            ctx.fillStyle = 'rgba(246, 224, 94, 0.75)';
            ctx.beginPath();
            ctx.arc(px, py, 1.4, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    function desenharParticulasAmbiente(ctx, t, camX, camY, cw, ch) {
        ctx.save();
        for (let i = 0; i < FOLHAS.length; i++) {
            const f = FOLHAS[i];
            const px = camX + ((f.rx * cw + t * f.vx * 35 + i * 20) % (cw + 80)) - 40;
            const py = camY + ((f.ry * ch + t * f.vy * 25 + i * 15) % (ch + 80)) - 40;
            const ang = f.ang + t * f.vAng * 10;

            ctx.save();
            ctx.translate(px, py);
            ctx.rotate(ang);
            ctx.fillStyle = f.cor;
            ctx.beginPath();
            ctx.ellipse(0, 0, f.tam, f.tam * 0.45, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
        ctx.restore();
    }

    // ========================================================================
    // PROFUNDIDADE 2.5D (Z-SORTING REAL DAS ÁRVORES)
    // ========================================================================
    function coletarVerdeSortables(tempoAnimacao, spritesSort) {
        if (!Array.isArray(spritesSort)) return;
        if (!arvores.length) gerarGrid();

        const camX = global.camX || 0, camY = global.camY || 0;
        const cw = ((global.canvas && global.canvas.width) || 900) / (global.ZOOM_CAMERA || 1);
        const ch = ((global.canvas && global.canvas.height) || 600) / (global.ZOOM_CAMERA || 1);

        for (let i = 0; i < arvores.length; i++) {
            const arv = arvores[i];
            // Frustum culling da árvore
            if (arv.x + 90 < camX || arv.x - 90 > camX + cw || arv.y + 90 < camY || arv.y - 120 > camY + ch) {
                continue;
            }

            spritesSort.push({
                y: arv.y, // Ponto de ancoragem no solo para ordenação Z
                draw: function () {
                    desenharArvoreCompleta(global.ctx, arv, tempoAnimacao);
                }
            });
        }
    }

    function desenharArvoreCompleta(ctx, arv, t) {
        if (!ctx) return;
        ctx.save();

        const x = arv.x, y = arv.y;
        const r = arv.raioCopa;
        const sway = Math.sin(t * 1.8 + arv.seed) * 3.5;

        // 1. Sombra projetada no chão
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.beginPath();
        ctx.ellipse(x + 4, y + 8, r * 0.85, r * 0.38, 0, 0, Math.PI * 2);
        ctx.fill();

        // 2. Tronco esculpido com raízes
        ctx.fillStyle = '#4a2d11';
        ctx.beginPath();
        ctx.moveTo(x - 9, y + 8);
        ctx.quadraticCurveTo(x - 6, y - 25, x - 5, y - 48);
        ctx.lineTo(x + 5, y - 48);
        ctx.quadraticCurveTo(x + 6, y - 25, x + 9, y + 8);
        ctx.closePath();
        ctx.fill();

        // Raízes laterais
        ctx.fillStyle = '#3a200a';
        ctx.beginPath();
        ctx.arc(x - 9, y + 8, 4, 0, Math.PI * 2);
        ctx.arc(x + 9, y + 8, 4, 0, Math.PI * 2);
        ctx.fill();

        // Realce de luz na casca do tronco
        ctx.fillStyle = '#6b4423';
        ctx.fillRect(x - 3, y - 35, 3, 26);

        // 3. Copa da árvore (3 camadas sobrepostas com balanço ao vento)
        // Camada 1: Sombra inferior verde escura
        ctx.fillStyle = '#1c4522';
        ctx.beginPath();
        ctx.arc(x - r * 0.45 + sway * 0.6, y - 55, r * 0.65, 0, Math.PI * 2);
        ctx.arc(x + r * 0.45 + sway * 0.6, y - 55, r * 0.65, 0, Math.PI * 2);
        ctx.arc(x + sway * 0.8, y - 80, r * 0.75, 0, Math.PI * 2);
        ctx.fill();

        // Camada 2: Miolo verde vivo
        ctx.fillStyle = '#276749';
        ctx.beginPath();
        ctx.arc(x - r * 0.35 + sway * 0.8, y - 62, r * 0.58, 0, Math.PI * 2);
        ctx.arc(x + r * 0.35 + sway * 0.8, y - 62, r * 0.58, 0, Math.PI * 2);
        ctx.arc(x + sway, y - 88, r * 0.68, 0, Math.PI * 2);
        ctx.fill();

        // Camada 3: Realce ensolarado superior
        ctx.fillStyle = '#48bb78';
        ctx.beginPath();
        ctx.arc(x - r * 0.2 + sway * 0.9, y - 72, r * 0.42, 0, Math.PI * 2);
        ctx.arc(x + r * 0.2 + sway * 0.9, y - 72, r * 0.38, 0, Math.PI * 2);
        ctx.arc(x - r * 0.05 + sway * 1.1, y - 100, r * 0.46, 0, Math.PI * 2);
        ctx.fill();

        // Frutinhas vermelhas
        if (arv.seed > 4.5) {
            ctx.fillStyle = '#e53e3e';
            ctx.beginPath();
            ctx.arc(x - r * 0.3 + sway, y - 50, 2.5, 0, Math.PI * 2);
            ctx.arc(x + r * 0.25 + sway, y - 65, 2.5, 0, Math.PI * 2);
            ctx.arc(x - r * 0.1 + sway, y - 85, 2.5, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    // ========================================================================
    // EXPORTAÇÃO ISOMÓRFICA
    // ========================================================================
    const api = {
        TILE: TILE,
        LARGURA_VERDE: LARGURA_VERDE,
        ALTO_VERDE: ALTO_VERDE,
        COLS: COLS,
        ROWS: ROWS,
        ALT_LIVRE: ALT_LIVRE,
        ALT_PAREDE: ALT_PAREDE,
        ACAMPAMENTOS: ACAMPAMENTOS,
        LAGOS: LAGOS,
        PORTAL_CIDADE: PORTAL_CIDADE,
        PORTAL_CAVERNA: PORTAL_CAVERNA,
        PORTAL_DESERTO: PORTAL_DESERTO,
        gerarGrid: gerarGrid,
        grid: function () { if (!grid) gerarGrid(); return grid; },
        arvores: function () { if (!arvores.length) gerarGrid(); return arvores; },
        isVerde: isVerde,
        colideVerde: colideVerde,
        colideProjetilVerde: colideProjetilVerde,
        desenharCenario: desenharCenario,
        coletarVerdeSortables: coletarVerdeSortables
    };

    if (typeof window !== 'undefined') {
        gerarGrid();
        global.LARGURA_VERDE = LARGURA_VERDE;
        global.ALTO_VERDE = ALTO_VERDE;
        global.desenharCenario = desenharCenario;
        global.coletarVerdeSortables = coletarVerdeSortables;
        global.ACAMPAMENTOS_MAPA = ACAMPAMENTOS;
        api.ACAMPAMENTOS = ACAMPAMENTOS;
        global.mapas = api;

        // Integração com a cadeia de colisão do cliente
        const antColide = global.colideMapaAtivo;
        global.colideMapaAtivo = function (x, y, raio) {
            if (global.currentMap === 'green') return !isVerde(x, y) || colideVerde(x, y, raio);
            return typeof antColide === 'function' ? antColide(x, y, raio) : false;
        };

        const antColideProj = global.colideProjetilMapaAtivo;
        global.colideProjetilMapaAtivo = function (x, y) {
            if (global.currentMap === 'green') return !isVerde(x, y) || colideProjetilVerde(x, y);
            return typeof antColideProj === 'function' ? antColideProj(x, y) : false;
        };
    }

    if (typeof module !== 'undefined' && module.exports) {
        if (!grid) gerarGrid();
        module.exports = api;
    }

})(typeof window !== 'undefined' ? window : globalThis);