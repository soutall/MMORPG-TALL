// ============================================================================
// mapa_teste_visual.js — Arena Visual (Bioma de Pântano Realista)
// Módulo isomórfico: funciona no navegador (window) e no servidor (module.exports).
// Coordenadas: x em [72000, 73280), y em [0, 960), TILE = 40px -> 32 cols x 24 rows.
// ============================================================================
(function (global) {
    'use strict';

    const TILE = 40;
    const TESTE_X0 = 72000;
    const TESTE_X1 = 73280;
    const TESTE_Y1 = 960;
    const COLS = 32;
    const ROWS = 24;

    const ALT_LIVRE = 0;
    const ALT_PEQUENA = 1;
    const ALT_MEDIA = 2;
    const ALT_PAREDE = 3;

    // Portal de retorno na entrada oeste -> leva para a Cidade de Davahl
    const PORTAL_RETORNO = { x: 72160, y: 480, r: 55, alvo: { x: 60474, y: 640 } };
    // Ponto de chegada quando o jogador teleporta para cá
    const PONTO_CHEGADA = { x: 72480, y: 480 };

    // ========================================================================
    // ESTRUTURAS DO BIOMA DE PÂNTANO
    // ========================================================================

    // 1. Cabana Principal Arruinada (Palafita de Madeira Carcomida)
    const CABANA_PRINCIPAL = {
        x: 72720,
        y: 330,
        w: 145,
        h: 96,
        rCol: 42,
        nome: "Cabana Arruinada da Bruxa do Pântano"
    };

    // 2. Choça Menor do Pescador Abandonada (Inclinada na Água)
    const CHOCA_PESCADOR = {
        x: 72920,
        y: 640,
        w: 100,
        h: 75,
        rCol: 30,
        nome: "Choça Decadente do Pescador"
    };

    // 3. Canoa de Madeira Furada e Semi-Submersa
    const CANOA_AFUNDADA = {
        x: 72840,
        y: 710,
        comprimento: 70,
        largura: 24,
        ang: 0.35
    };

    // 4. Árvores Gigantes de Pântano com Z-Sorting (Ciprestes e Salgueiros)
    const ARVORES_PANTANO = [
        // Ciprestes-Calvos (Swamp Bald Cypress) com raízes aéreas cônicas (joelhos de cipreste)
        { x: 72320, y: 220, tipo: 'cipreste', rCol: 22, h: 140, troncoL: 26, seed: 1.1 },
        { x: 72460, y: 780, tipo: 'cipreste', rCol: 20, h: 125, troncoL: 24, seed: 2.4 },
        { x: 73000, y: 190, tipo: 'cipreste', rCol: 24, h: 145, troncoL: 28, seed: 3.7 },
        { x: 73120, y: 530, tipo: 'cipreste', rCol: 21, h: 130, troncoL: 25, seed: 4.9 },
        { x: 72680, y: 840, tipo: 'cipreste', rCol: 23, h: 138, troncoL: 27, seed: 5.8 },

        // Salgueiros-Chorões com Barba-de-Velho (Spanish Moss pendente)
        { x: 72280, y: 690, tipo: 'salgueiro', rCol: 20, h: 115, troncoL: 22, seed: 6.2 },
        { x: 72580, y: 190, tipo: 'salgueiro', rCol: 22, h: 120, troncoL: 24, seed: 7.5 },
        { x: 73060, y: 810, tipo: 'salgueiro', rCol: 21, h: 122, troncoL: 23, seed: 8.3 },
        { x: 72840, y: 150, tipo: 'salgueiro', rCol: 19, h: 110, troncoL: 20, seed: 9.1 }
    ];

    // 5. Troncos Mortos Tombados e Ocos (Logs)
    const TRONCOS_MORTOS = [
        { x: 72380, y: 370, comp: 80, alt: 22, rCol: 18, ang: 0.2, fungos: true },
        { x: 72940, y: 430, comp: 95, alt: 26, rCol: 20, ang: -0.25, fungos: true },
        { x: 72600, y: 690, comp: 70, alt: 20, rCol: 16, ang: 0.5, fungos: false }
    ];

    // 6. Tufos de Taboas / Juncos Altos (Cattails) nas Margens da Água
    const TABOAS = [
        { x: 72380, y: 560, count: 8, seed: 1.2 },
        { x: 72520, y: 630, count: 10, seed: 2.1 },
        { x: 72780, y: 490, count: 12, seed: 3.4 },
        { x: 72820, y: 220, count: 9, seed: 4.7 },
        { x: 73100, y: 340, count: 11, seed: 5.3 },
        { x: 72980, y: 760, count: 8, seed: 6.8 },
        { x: 72660, y: 220, count: 7, seed: 7.2 }
    ];

    // 7. Cogumelos Bioluminescentes e Fungos de Lodo
    const COGUMELOS = [
        { x: 72340, y: 245, cor: '#2ec4b6', r: 5, brilho: true },
        { x: 72352, y: 252, cor: '#06d6a0', r: 4, brilho: true },
        { x: 72475, y: 805, cor: '#9b5de5', r: 5, brilho: true },
        { x: 72490, y: 812, cor: '#06d6a0', r: 4, brilho: true },
        { x: 72695, y: 865, cor: '#2ec4b6', r: 6, brilho: true },
        { x: 72740, y: 410, cor: '#f15bb5', r: 4, brilho: false },
        { x: 72960, y: 450, cor: '#06d6a0', r: 5, brilho: true }
    ];

    // 8. Efeitos Atmosféricos: Bolhas de Gás Metano que Emergem e Estouram
    const BOLHAS_METANO = [
        { x: 72520, y: 580, fase: 0.2, vel: 0.035, tam: 6 },
        { x: 72680, y: 440, fase: 1.4, vel: 0.040, tam: 7 },
        { x: 72860, y: 350, fase: 2.7, vel: 0.030, tam: 5 },
        { x: 73040, y: 460, fase: 3.9, vel: 0.045, tam: 8 },
        { x: 72920, y: 760, fase: 0.8, vel: 0.038, tam: 6 },
        { x: 72740, y: 620, fase: 2.1, vel: 0.032, tam: 7 }
    ];

    // 9. Fogos-Fátuos / Vagalumes (Will-o'-the-Wisps) Dançantes
    const FOGOS_FATUOS = [
        { x: 72420, y: 360, vx: 0.3, vy: 0.2, raioOrb: 35, cor: 'rgba(46, 196, 182, 0.85)', seed: 1 },
        { x: 72640, y: 520, vx: -0.25, vy: 0.35, raioOrb: 45, cor: 'rgba(6, 214, 160, 0.85)', seed: 2 },
        { x: 72820, y: 400, vx: 0.4, vy: -0.2, raioOrb: 40, cor: 'rgba(155, 93, 229, 0.80)', seed: 3 },
        { x: 72980, y: 600, vx: -0.3, vy: -0.3, raioOrb: 38, cor: 'rgba(46, 196, 182, 0.85)', seed: 4 },
        { x: 72560, y: 720, vx: 0.35, vy: 0.25, raioOrb: 42, cor: 'rgba(255, 209, 102, 0.80)', seed: 5 },
        { x: 73100, y: 420, vx: -0.2, vy: 0.4, raioOrb: 36, cor: 'rgba(6, 214, 160, 0.85)', seed: 6 }
    ];

    let grid = null;
    let chainAnterior = null;
    let transicaoAtiva = false;

    // Função de dispersão determinística
    function hash2(x, y, s) {
        let n = (x * 374761393 + y * 668265263 + (s || 0)) | 0;
        n = Math.imul(n ^ (n >>> 13), 1274126177);
        return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
    }

    // ========================================================================
    // GERAÇÃO PROCEDURAL DO GRID DE TERRENO DO PÂNTANO
    // ========================================================================
    function gerarGrid() {
        if (grid) return grid;
        grid = [];

        // Lagoas e Brejos Pantanosos no centro-leste (cols 14 a 29, rows 6 a 20)
        const lago1 = { cx: 21, cy: 11, rx: 7.5, ry: 4.8 };
        const lago2 = { cx: 24, cy: 16, rx: 5.5, ry: 4.0 };

        for (let l = 0; l < ROWS; l++) {
            const row = [];
            for (let c = 0; c < COLS; c++) {
                let tipo = 'lodo';
                let alt = ALT_LIVRE;

                // 1. Bordas do mapa: densa muralha impenetrável de ciprestes retorcidos
                if (l === 0 || l === ROWS - 1 || c === 0 || c === COLS - 1) {
                    tipo = 'muralha_cipreste';
                    alt = ALT_PAREDE;
                }
                else {
                    // Distâncias até as lagoas pantanosas
                    const d1 = Math.hypot((c - lago1.cx) / lago1.rx, (l - lago1.cy) / lago1.ry);
                    const d2 = Math.hypot((c - lago2.cx) / lago2.rx, (l - lago2.cy) / lago2.ry);
                    const distAgua = Math.min(d1, d2);

                    // 2. Passarelas de madeira podre (Boardwalks)
                    // Passarela oeste-leste ligando o portal à cabana
                    const naPassarelaPrincipal = (l === 12 && c >= 2 && c <= 16);
                    // Ramificação para o norte rumo à Cabana Principal
                    const naPassarelaNorte = (c === 16 && l >= 8 && l <= 12);
                    // Ramificação para o sul rumo à Choça do Pescador
                    const naPassarelaSul = (c === 16 && l >= 12 && l <= 16) || (l === 16 && c >= 16 && c <= 22);

                    const ehPassarela = (naPassarelaPrincipal || naPassarelaNorte || naPassarelaSul);

                    if (ehPassarela) {
                        tipo = 'passarela';
                        alt = ALT_LIVRE;
                    } else if (distAgua < 0.75) {
                        tipo = 'agua_funda';
                        alt = ALT_PAREDE; // Água escura profunda intransponível
                    } else if (distAgua < 1.0) {
                        tipo = 'agua_turva';
                        alt = ALT_PAREDE; // Água rasa pantanosa com nenúfares
                    } else if (distAgua < 1.25) {
                        tipo = 'margem_lodo';
                        alt = ALT_LIVRE; // Lama úmida pegajosa com juncos
                    } else {
                        // Terreno de turfa, musgo ou bolsões de lama
                        const hMusgo = hash2(c, l, 83);
                        if (hMusgo > 0.65) {
                            tipo = 'musgo';
                            alt = ALT_LIVRE;
                        } else if (hMusgo < 0.25) {
                            tipo = 'lama_movedica';
                            alt = ALT_LIVRE;
                        } else {
                            tipo = 'lodo';
                            alt = ALT_LIVRE;
                        }
                    }
                }

                row.push({ tipo: tipo, alt: alt, autotileMask: 0 });
            }
            grid.push(row);
        }

        // Calcular bitmasks de autotiling 4-bit (Norte=1, Leste=2, Sul=4, Oeste=8)
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

        return grid;
    }

    function isTesteVisual(x, y) {
        return x >= TESTE_X0 && x < TESTE_X1 && y >= 0 && y < TESTE_Y1;
    }

    // ========================================================================
    // DETECÇÃO DE COLISÕES
    // ========================================================================
    function colide(x, y, raio) {
        if (!isTesteVisual(x, y)) return true;
        if (!grid) gerarGrid();
        raio = Number(raio) || 12;

        // Limites estritos do retângulo da arena
        if (x - raio < TESTE_X0 + 40 || x + raio >= TESTE_X1 - 40 || y - raio < 40 || y + raio >= TESTE_Y1 - 40) {
            return true;
        }

        // Colisão com os blocos da grade (muralhas vegetais e água profunda)
        const c0 = Math.max(0, Math.floor((x - TESTE_X0 - raio) / TILE));
        const c1 = Math.min(COLS - 1, Math.floor((x - TESTE_X0 + raio) / TILE));
        const l0 = Math.max(0, Math.floor((y - raio) / TILE));
        const l1 = Math.min(ROWS - 1, Math.floor((y + raio) / TILE));

        for (let l = l0; l <= l1; l++) {
            for (let c = c0; c <= c1; c++) {
                if (grid[l][c].alt >= ALT_PAREDE) return true;
            }
        }

        // Colisão com troncos sólidos de Ciprestes e Salgueiros
        for (let i = 0; i < ARVORES_PANTANO.length; i++) {
            const arv = ARVORES_PANTANO[i];
            if (Math.hypot(x - arv.x, y - arv.y) < (arv.rCol + raio)) return true;
        }

        // Colisão com troncos mortos caídos
        for (let i = 0; i < TRONCOS_MORTOS.length; i++) {
            const tr = TRONCOS_MORTOS[i];
            if (Math.hypot(x - tr.x, y - tr.y) < (tr.rCol + raio)) return true;
        }

        // Colisão com as paredes/palafitas da Cabana Principal Arruinada
        if (Math.hypot(x - CABANA_PRINCIPAL.x, y - (CABANA_PRINCIPAL.y - 10)) < (CABANA_PRINCIPAL.rCol + raio)) {
            return true;
        }

        // Colisão com a Choça do Pescador
        if (Math.hypot(x - CHOCA_PESCADOR.x, y - (CHOCA_PESCADOR.y - 10)) < (CHOCA_PESCADOR.rCol + raio)) {
            return true;
        }

        return false;
    }

    function colideProjetil(x, y) {
        if (!isTesteVisual(x, y)) return true;
        if (!grid) gerarGrid();
        if (x < TESTE_X0 + 40 || x >= TESTE_X1 - 40 || y < 40 || y >= TESTE_Y1 - 40) return true;

        const c = Math.floor((x - TESTE_X0) / TILE);
        const l = Math.floor(y / TILE);
        if (c < 0 || c >= COLS || l < 0 || l >= ROWS) return true;
        if (grid[l][c].tipo === 'muralha_cipreste') return true;

        // Cabanas bloqueiam projéteis
        if (Math.hypot(x - CABANA_PRINCIPAL.x, y - CABANA_PRINCIPAL.y) < CABANA_PRINCIPAL.rCol) return true;
        if (Math.hypot(x - CHOCA_PESCADOR.x, y - CHOCA_PESCADOR.y) < CHOCA_PESCADOR.rCol) return true;

        return false;
    }

    // ========================================================================
    // TRANSIÇÃO E PORTAIS
    // ========================================================================
    function infoPortalTeste(x, y) {
        if (!isTesteVisual(x, y)) return null;
        if (Math.hypot(x - PORTAL_RETORNO.x, y - PORTAL_RETORNO.y) < PORTAL_RETORNO.r) {
            return { via: 'portal', mapa: 'cidade', alvo: PORTAL_RETORNO.alvo };
        }
        return null;
    }

    function onUpdatePosicao(x, y) {
        if (transicaoAtiva || !isTesteVisual(x, y)) return;
        const port = infoPortalTeste(x, y);
        if (!port) return;

        transicaoAtiva = true;
        if (typeof global.iniciarTransicaoTela === 'function') {
            global.iniciarTransicaoTela(function () {
                if (typeof global.teleportarPara === 'function') {
                    global.teleportarPara(port.alvo.x, port.alvo.y, port.mapa);
                }
                setTimeout(function () { transicaoAtiva = false; }, 400);
            });
        } else {
            if (typeof global.teleportarPara === 'function') {
                global.teleportarPara(port.alvo.x, port.alvo.y, port.mapa);
            }
            setTimeout(function () { transicaoAtiva = false; }, 400);
        }
    }

    // ========================================================================
    // RENDERIZAÇÃO DO CENÁRIO DO PÂNTANO
    // ========================================================================
    function desenharCenarioTesteVisual(tempoAnimacao) {
        const ctx = global.ctx;
        if (!ctx) return;

        if (!grid) gerarGrid();
        const t = (tempoAnimacao || 0) * 0.001;

        // 1. Renderizar os tiles de fundo do terreno
        for (let l = 0; l < ROWS; l++) {
            for (let c = 0; c < COLS; c++) {
                const x = TESTE_X0 + c * TILE;
                const y = l * TILE;
                const cel = grid[l][c];
                desenharTilePantano(ctx, x, y, c, l, cel.tipo, cel.autotileMask, t);
            }
        }

        // 2. Renderizar vegetação aquática (Nenúfares e Vitórias-Régias na água)
        desenharNenufares(ctx, t);

        // 3. Renderizar Canoa Furada semi-afundada
        desenharCanoaAfundada(ctx, CANOA_AFUNDADA);

        // 4. Renderizar Portal Rúnico de Cipreste Ancestral
        desenharPortalCipreste(ctx, PORTAL_RETORNO.x, PORTAL_RETORNO.y, t);

        // 5. Renderizar Bolhas de Gás Metano emergindo e estourando
        desenharBolhasMetano(ctx, t);

        // 6. Renderizar Névoa Baixa Rasteira Volumétrica
        desenharNevoaPantano(ctx, t);

        // 7. Renderizar Fogos-Fátuos / Vagalumes luminosos
        desenharFogosFatuos(ctx, t);
    }

    // ========================================================================
    // RENDERIZAÇÃO DOS TILES DE TERRENO DO PÂNTANO
    // ========================================================================
    function desenharTilePantano(ctx, x, y, c, l, tipo, mask, t) {
        const seed = hash2(c, l, 42);

        // A. Muralha de Ciprestes e Raízes (Bordas)
        if (tipo === 'muralha_cipreste') {
            ctx.fillStyle = '#0d160b';
            ctx.fillRect(x, y, TILE, TILE);

            // Cascas retorcidas e musgo
            ctx.fillStyle = '#182914';
            ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
            ctx.fillStyle = '#263d1e';
            ctx.fillRect(x + 6, y + 8, TILE - 12, TILE - 16);

            // Folhagem densa escura no topo
            ctx.fillStyle = '#1e3318';
            ctx.beginPath();
            ctx.arc(x + 20, y + 20, 16, 0, Math.PI * 2);
            ctx.fill();
            return;
        }

        // B. Água Pantanosa Profunda e Rasa
        if (tipo === 'agua_funda' || tipo === 'agua_turva') {
            const ehFunda = (tipo === 'agua_funda');
            ctx.fillStyle = ehFunda ? '#122217' : '#182d1e';
            ctx.fillRect(x, y, TILE, TILE);

            // Marolas lentas e reflexos esverdeados
            const wave = Math.sin(t * 1.5 + c * 0.4 + l * 0.3) * 2;
            ctx.strokeStyle = ehFunda ? 'rgba(35, 65, 45, 0.45)' : 'rgba(50, 95, 60, 0.50)';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(x + 4, y + 14 + wave);
            ctx.quadraticCurveTo(x + 20, y + 10 + wave, x + 36, y + 15 + wave);
            ctx.stroke();

            // Manchas de lentilhas d'água (duckweed / musgo flutuante)
            if (seed > 0.45) {
                ctx.fillStyle = '#2d5320';
                ctx.beginPath();
                ctx.arc(x + 12 + seed * 8, y + 18 + wave, 3.5, 0, Math.PI * 2);
                ctx.arc(x + 24 + seed * 6, y + 26 + wave, 2.8, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#41732d';
                ctx.beginPath();
                ctx.arc(x + 14 + seed * 8, y + 17 + wave, 1.8, 0, Math.PI * 2);
                ctx.fill();
            }
            return;
        }

        // C. Margem de Lodo Úmido
        if (tipo === 'margem_lodo') {
            ctx.fillStyle = '#1e2918';
            ctx.fillRect(x, y, TILE, TILE);

            // Brilho de umidade da lama
            ctx.fillStyle = 'rgba(70, 95, 55, 0.35)';
            ctx.fillRect(x + 4, y + 6, TILE - 8, 4);

            // Manchas escuras de lodo fétido
            ctx.fillStyle = '#141d10';
            ctx.beginPath();
            ctx.ellipse(x + 20, y + 22, 14, 8, 0.2, 0, Math.PI * 2);
            ctx.fill();
            return;
        }

        // D. Passarela de Madeira Podre (Boardwalk)
        if (tipo === 'passarela') {
            // Lama por baixo da passarela
            ctx.fillStyle = '#162013';
            ctx.fillRect(x, y, TILE, TILE);

            // Sombra das tábuas no lodo
            ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
            ctx.fillRect(x + 2, y + 4, TILE - 4, TILE - 2);

            // Pranchas de madeira desgastada
            ctx.fillStyle = seed > 0.5 ? '#433422' : '#3a2b1c';
            ctx.fillRect(x + 3, y + 2, TILE - 6, 11);
            ctx.fillRect(x + 3, y + 14, TILE - 6, 11);
            ctx.fillRect(x + 3, y + 26, TILE - 6, 11);

            // Frestas escuras entre as tábuas
            ctx.fillStyle = '#1a1209';
            ctx.fillRect(x + 3, y + 13, TILE - 6, 1.5);
            ctx.fillRect(x + 3, y + 25, TILE - 6, 1.5);

            // Pregos enferrujados nas extremidades
            ctx.fillStyle = '#1f160e';
            ctx.fillRect(x + 6, y + 7, 2, 2);
            ctx.fillRect(x + TILE - 8, y + 7, 2, 2);
            ctx.fillRect(x + 6, y + 19, 2, 2);
            ctx.fillRect(x + TILE - 8, y + 19, 2, 2);

            // Mancha de musgo verde incrustada na borda da madeira
            if (seed > 0.4) {
                ctx.fillStyle = '#315424';
                ctx.fillRect(x + 3, y + 2, 8, 3);
                ctx.fillRect(x + TILE - 11, y + 28, 8, 3);
            }
            return;
        }

        // E. Terreno Padrão de Pântano: Lodo, Musgo ou Lama Movediça
        let corBase = '#1c2817';
        if (tipo === 'musgo') corBase = '#273c1c';
        else if (tipo === 'lama_movedica') corBase = '#152012';

        ctx.fillStyle = corBase;
        ctx.fillRect(x, y, TILE, TILE);

        // Textura orgânica de terra úmida, raízes e musgo
        if (seed > 0.6) {
            ctx.fillStyle = '#344e26';
            ctx.beginPath();
            ctx.ellipse(x + 18, y + 16, 10, 6, 0.4, 0, Math.PI * 2);
            ctx.fill();
        } else if (seed < 0.3) {
            ctx.fillStyle = '#131b10';
            ctx.beginPath();
            ctx.ellipse(x + 22, y + 24, 12, 7, -0.3, 0, Math.PI * 2);
            ctx.fill();
        }

        // Poça d'água estagnada rasa esparsa
        if (seed > 0.85) {
            ctx.fillStyle = '#1a3022';
            ctx.beginPath();
            ctx.ellipse(x + 20, y + 20, 8, 5, 0.1, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // ========================================================================
    // NENÚFARES E VITÓRIAS-RÉGIAS NA ÁGUA
    // ========================================================================
    function desenharNenufares(ctx, t) {
        const nenufares = [
            { x: 72780, y: 460, r: 14, flor: true },
            { x: 72830, y: 440, r: 10, flor: false },
            { x: 72740, y: 520, r: 16, flor: true },
            { x: 72880, y: 490, r: 12, flor: false },
            { x: 72960, y: 550, r: 15, flor: true },
            { x: 72910, y: 380, r: 11, flor: false },
            { x: 73020, y: 430, r: 13, flor: true },
            { x: 72780, y: 640, r: 12, flor: false },
            { x: 72840, y: 670, r: 15, flor: true }
        ];

        for (let i = 0; i < nenufares.length; i++) {
            const n = nenufares[i];
            const flutua = Math.sin(t * 1.8 + i) * 1.5;

            // Folha circular com recorte característico
            ctx.save();
            ctx.translate(n.x, n.y + flutua);

            // Sombra na água turva
            ctx.fillStyle = 'rgba(10, 20, 12, 0.45)';
            ctx.beginPath();
            ctx.ellipse(2, 4, n.r, n.r * 0.7, 0, 0, Math.PI * 2);
            ctx.fill();

            // Corpo da folha verde-oliva
            ctx.fillStyle = '#2f5a24';
            ctx.beginPath();
            ctx.arc(0, 0, n.r, 0.3, Math.PI * 2 - 0.3);
            ctx.lineTo(0, 0);
            ctx.closePath();
            ctx.fill();

            // Nervuras da folha
            ctx.strokeStyle = '#437734';
            ctx.lineWidth = 1.0;
            ctx.beginPath();
            ctx.arc(0, 0, n.r * 0.65, 0.4, Math.PI * 2 - 0.4);
            ctx.stroke();

            // Flor aquática branca/amarela no centro
            if (n.flor) {
                ctx.fillStyle = '#fefae0';
                ctx.beginPath();
                ctx.arc(-2, -2, 3.8, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#e9c46a';
                ctx.beginPath();
                ctx.arc(-2, -2, 1.8, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
        }
    }

    // ========================================================================
    // CANOA DE MADEIRA FURADA E SEMI-SUBMERSA
    // ========================================================================
    function desenharCanoaAfundada(ctx, canoa) {
        ctx.save();
        ctx.translate(canoa.x, canoa.y);
        ctx.rotate(canoa.ang);

        // Sombra da carcaça na lama
        ctx.fillStyle = 'rgba(10, 15, 8, 0.55)';
        ctx.beginPath();
        ctx.ellipse(4, 6, canoa.comprimento / 2 + 6, canoa.largura / 2 + 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Casco exterior de madeira apodrecida
        ctx.fillStyle = '#3a2717';
        ctx.beginPath();
        ctx.ellipse(0, 0, canoa.comprimento / 2, canoa.largura / 2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Interior escuro cheio de lodo e água estagnada
        ctx.fillStyle = '#162215';
        ctx.beginPath();
        ctx.ellipse(0, 0, canoa.comprimento / 2 - 4, canoa.largura / 2 - 3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Tábuas quebradas / rombo no casco
        ctx.strokeStyle = '#1d120a';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-10, -6);
        ctx.lineTo(8, 4);
        ctx.stroke();

        // Musgo e limo escorrendo pelo bordo
        ctx.fillStyle = '#315424';
        ctx.fillRect(-15, -canoa.largura / 2, 18, 3);
        ctx.fillRect(6, canoa.largura / 2 - 3, 14, 3);

        ctx.restore();
    }

    // ========================================================================
    // PORTAL RÚNICO DE CIPRESTE ANCESTRAL
    // ========================================================================
    function desenharPortalCipreste(ctx, px, py, t) {
        ctx.save();
        ctx.translate(px, py);

        // Iluminação mística esmeralda suave no solo
        const pulsar = 1 + Math.sin(t * 3.5) * 0.08;
        const gLuz = ctx.createRadialGradient(0, 0, 10, 0, 0, 75 * pulsar);
        gLuz.addColorStop(0, 'rgba(46, 196, 182, 0.45)');
        gLuz.addColorStop(0.5, 'rgba(6, 214, 160, 0.18)');
        gLuz.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = gLuz;
        ctx.beginPath();
        ctx.arc(0, 0, 75 * pulsar, 0, Math.PI * 2);
        ctx.fill();

        // Raízes retorcidas de cipreste formando um arco de portal
        ctx.strokeStyle = '#2b1b11';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.arc(0, -10, 42, Math.PI * 0.85, Math.PI * 2.15);
        ctx.stroke();

        ctx.strokeStyle = '#432d1d';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, -10, 42, Math.PI * 0.85, Math.PI * 2.15);
        ctx.stroke();

        // Vórtice místico de névoa esmeralda giratória
        ctx.save();
        ctx.rotate(t * 1.4);
        for (let i = 0; i < 4; i++) {
            ctx.rotate(Math.PI / 2);
            ctx.strokeStyle = 'rgba(46, 196, 182, 0.65)';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(0, 0, 26, 0, Math.PI * 0.65);
            ctx.stroke();
        }
        ctx.restore();

        // Runas antigas brilhando em verde-esmeralda
        ctx.fillStyle = '#2ec4b6';
        ctx.shadowColor = '#06d6a0';
        ctx.shadowBlur = 8;
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('ᚱᚢᚾ', 0, -56);
        ctx.shadowBlur = 0;

        ctx.restore();
    }

    // ========================================================================
    // BOLHAS DE GÁS METANO QUE SOBEM E ESTOURAM
    // ========================================================================
    function desenharBolhasMetano(ctx, t) {
        ctx.save();
        for (let i = 0; i < BOLHAS_METANO.length; i++) {
            const b = BOLHAS_METANO[i];
            const ciclo = (t * b.vel * 20 + b.fase) % 3.0; // Ciclo de 3 segundos

            if (ciclo < 2.0) {
                // Bolha crescendo e subindo lentamente na lâmina de água
                const progresso = ciclo / 2.0;
                const rAtual = b.tam * (0.3 + progresso * 0.7);
                const offY = -progresso * 6;

                // Sombra da bolha
                ctx.fillStyle = 'rgba(10, 20, 10, 0.35)';
                ctx.beginPath();
                ctx.ellipse(b.x, b.y + offY + 2, rAtual, rAtual * 0.6, 0, 0, Math.PI * 2);
                ctx.fill();

                // Corpo translúcido da bolha com tom de gás esverdeado
                ctx.fillStyle = 'rgba(75, 140, 95, 0.45)';
                ctx.beginPath();
                ctx.arc(b.x, b.y + offY, rAtual, 0, Math.PI * 2);
                ctx.fill();

                // Ponto de luz no topo da bolha
                ctx.fillStyle = 'rgba(200, 255, 220, 0.75)';
                ctx.beginPath();
                ctx.arc(b.x - rAtual * 0.35, b.y + offY - rAtual * 0.35, rAtual * 0.3, 0, Math.PI * 2);
                ctx.fill();
            } else if (ciclo < 2.6) {
                // Estouro da bolha: dispersão de vapor esverdeado tênue
                const progEstouro = (ciclo - 2.0) / 0.6;
                const rFumaca = b.tam * (1.2 + progEstouro * 2.5);
                const alphaFumaca = Math.max(0, 0.45 * (1.0 - progEstouro));

                ctx.fillStyle = `rgba(110, 180, 120, ${alphaFumaca})`;
                ctx.beginPath();
                ctx.arc(b.x, b.y - 8 - progEstouro * 12, rFumaca, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.restore();
    }

    // ========================================================================
    // NÉVOA BAIXA RASTEIRA VOLUMÉTRICA (SWAMP MIST)
    // ========================================================================
    function desenharNevoaPantano(ctx, t) {
        ctx.save();
        const numCamadas = 3;

        for (let i = 0; i < numCamadas; i++) {
            const vel = 12 + i * 8;
            const xOffset = ((t * vel) % (TESTE_X1 - TESTE_X0 + 300)) - 150;
            const yBase = 250 + i * 220 + Math.sin(t * 0.8 + i) * 20;

            const grad = ctx.createLinearGradient(0, yBase - 40, 0, yBase + 40);
            grad.addColorStop(0, 'rgba(160, 200, 175, 0)');
            grad.addColorStop(0.5, 'rgba(140, 185, 155, 0.14)');
            grad.addColorStop(1, 'rgba(160, 200, 175, 0)');

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(TESTE_X0, yBase);

            for (let px = TESTE_X0; px <= TESTE_X1; px += 80) {
                const ondula = Math.sin((px + xOffset) * 0.012 + t * 0.7) * 25;
                ctx.lineTo(px, yBase + ondula);
            }

            ctx.lineTo(TESTE_X1, yBase + 45);
            ctx.lineTo(TESTE_X0, yBase + 45);
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();
    }

    // ========================================================================
    // FOGOS-FÁTUOS / VAGALUMES (WILL-O'-THE-WISPS)
    // ========================================================================
    function desenharFogosFatuos(ctx, t) {
        ctx.save();
        for (let i = 0; i < FOGOS_FATUOS.length; i++) {
            const f = FOGOS_FATUOS[i];
            const fx = f.x + Math.sin(t * f.vx * 3.0 + f.seed) * f.raioOrb;
            const fy = f.y + Math.cos(t * f.vy * 3.0 + f.seed) * (f.raioOrb * 0.7);
            const pulsar = 0.85 + Math.sin(t * 5.0 + f.seed * 2) * 0.25;

            // Halo suave
            const gHalo = ctx.createRadialGradient(fx, fy, 1, fx, fy, 16 * pulsar);
            gHalo.addColorStop(0, f.cor);
            gHalo.addColorStop(0.6, 'rgba(46, 196, 182, 0.15)');
            gHalo.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = gHalo;
            ctx.beginPath();
            ctx.arc(fx, fy, 16 * pulsar, 0, Math.PI * 2);
            ctx.fill();

            // Núcleo brilhante
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(fx, fy, 2.2 * pulsar, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    // ========================================================================
    // COLETA E ORDENAÇÃO DE SORTABLES (Z-SORTING 2.5D REAL)
    // ========================================================================
    function coletarTestevisualSortables(tempoAnimacao, spritesSort) {
        if (!spritesSort) return;
        const t = (tempoAnimacao || 0) * 0.001;

        // 1. Cabana Principal Arruinada
        spritesSort.push({
            tipo: 'cabana_principal_arruinada',
            y: CABANA_PRINCIPAL.y + 20,
            draw: function () {
                desenharCabanaPrincipalRealista(global.ctx, CABANA_PRINCIPAL, t);
            }
        });

        // 2. Choça Menor do Pescador Abandonada
        spritesSort.push({
            tipo: 'choca_pescador_arruinada',
            y: CHOCA_PESCADOR.y + 15,
            draw: function () {
                desenharChocaPescadorRealista(global.ctx, CHOCA_PESCADOR, t);
            }
        });

        // 3. Troncos Mortos e Ocos Caídos
        for (let i = 0; i < TRONCOS_MORTOS.length; i++) {
            const tr = TRONCOS_MORTOS[i];
            spritesSort.push({
                tipo: 'tronco_morto',
                y: tr.y + 8,
                draw: function () {
                    desenharTroncoMortoRealista(global.ctx, tr, t);
                }
            });
        }

        // 4. Árvores de Pântano (Ciprestes e Salgueiros)
        for (let i = 0; i < ARVORES_PANTANO.length; i++) {
            const arv = ARVORES_PANTANO[i];
            spritesSort.push({
                tipo: 'arvore_pantano',
                y: arv.y,
                draw: function () {
                    if (arv.tipo === 'cipreste') {
                        desenharCipresteRealista(global.ctx, arv, t);
                    } else {
                        desenharSalgueiroRealista(global.ctx, arv, t);
                    }
                }
            });
        }

        // 5. Tufos de Taboas / Juncos Altos
        for (let i = 0; i < TABOAS.length; i++) {
            const tab = TABOAS[i];
            spritesSort.push({
                tipo: 'taboas_pantano',
                y: tab.y,
                draw: function () {
                    desenharTaboasRealistas(global.ctx, tab, t);
                }
            });
        }

        // 6. Cogumelos Bioluminescentes
        for (let i = 0; i < COGUMELOS.length; i++) {
            const cog = COGUMELOS[i];
            spritesSort.push({
                tipo: 'cogumelo_pantano',
                y: cog.y,
                draw: function () {
                    desenharCogumeloRealista(global.ctx, cog, t);
                }
            });
        }
    }

    // ========================================================================
    // DESENHO DETALHADO DA CABANA PRINCIPAL ARRUINADA
    // ========================================================================
    function desenharCabanaPrincipalRealista(ctx, cab, t) {
        if (!ctx) return;
        ctx.save();
        const x = cab.x;
        const y = cab.y;
        const w = cab.w;
        const h = cab.h;

        // 1. Sombra projetada no lodo/água
        ctx.fillStyle = 'rgba(10, 15, 8, 0.65)';
        ctx.beginPath();
        ctx.ellipse(x, y + 25, w * 0.58, 28, 0, 0, Math.PI * 2);
        ctx.fill();

        // 2. Palafitas e Estacas Inclinadas de Madeira Podre
        const estacasX = [-55, -25, 0, 30, 55];
        for (let i = 0; i < estacasX.length; i++) {
            const ex = x + estacasX[i];
            const inclinacao = (i % 2 === 0 ? -3 : 4);

            // Sombra da estaca
            ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            ctx.fillRect(ex + 2, y + 5, 5, 24);

            // Madeira molhada da estaca
            ctx.fillStyle = '#241910';
            ctx.beginPath();
            ctx.moveTo(ex - 3, y - 5);
            ctx.lineTo(ex + 3, y - 5);
            ctx.lineTo(ex + 3 + inclinacao, y + 26);
            ctx.lineTo(ex - 3 + inclinacao, y + 26);
            ctx.closePath();
            ctx.fill();

            // Limo verde escorrendo da base da estaca na lama
            ctx.fillStyle = '#2f5020';
            ctx.fillRect(ex - 4 + inclinacao, y + 16, 8, 10);
        }

        // 3. Piso e Decks da Varanda Semi-Desabada
        ctx.fillStyle = '#3a2717';
        ctx.fillRect(x - w * 0.48, y - 8, w * 0.96, 12);
        ctx.fillStyle = '#26190e';
        ctx.fillRect(x - w * 0.48, y + 4, w * 0.96, 4);

        // Pranchas soltas inclinadas na varanda
        ctx.fillStyle = '#4a331f';
        ctx.save();
        ctx.translate(x + 25, y + 2);
        ctx.rotate(0.2);
        ctx.fillRect(-15, -4, 30, 8);
        ctx.restore();

        // Barril de madeira quebrado e apodrecido na varanda
        ctx.fillStyle = '#362415';
        ctx.beginPath();
        ctx.ellipse(x + 50, y - 2, 9, 12, 0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#1d1209';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // 4. Paredes de Tábuas Desalinhadas e Carcomidas
        ctx.fillStyle = '#20150d';
        ctx.fillRect(x - w * 0.42, y - h * 0.75, w * 0.84, h * 0.72); // Interior escuro visível

        // Tábuas externas com frestas e madeira desgastada
        const numTabuas = 10;
        for (let ti = 0; ti < numTabuas; ti++) {
            const ty = y - h * 0.72 + ti * 6.5;
            const seedT = hash2(ti, 99);
            const falha = (seedT > 0.82); // Tábua quebrada/faltando!

            if (!falha) {
                ctx.fillStyle = (ti % 2 === 0 ? '#43301e' : '#392818');
                const largT = w * 0.84 - (seedT > 0.6 ? 14 : 0);
                const offT = (seedT > 0.5 ? -3 : 2);
                ctx.fillRect(x - w * 0.42 + offT, ty, largT, 5.5);

                // Mancha de musgo
                if (seedT > 0.5) {
                    ctx.fillStyle = '#345425';
                    ctx.fillRect(x - w * 0.42 + offT + 12, ty, 10, 2);
                }
            }
        }

        // Porta arrebentada pendurada por um único gonzos
        ctx.save();
        ctx.translate(x - 8, y - h * 0.48);
        ctx.rotate(0.18);
        ctx.fillStyle = '#4f3724';
        ctx.fillRect(-12, -18, 24, 36);
        ctx.strokeStyle = '#23160c';
        ctx.lineWidth = 2.0;
        ctx.strokeRect(-12, -18, 24, 36);
        ctx.restore();

        // Janela quebrada com cortina rasgada
        ctx.fillStyle = '#100b07';
        ctx.fillRect(x + 22, y - h * 0.55, 18, 16);
        ctx.strokeStyle = '#3a2717';
        ctx.lineWidth = 2.0;
        ctx.strokeRect(x + 22, y - h * 0.55, 18, 16);

        // 5. Telhado Parcialmente Desabado com Vigas Expostas
        // Lado esquerdo do telhado (ainda de pé, mas coberto de palha podre e musgo)
        ctx.fillStyle = '#312417';
        ctx.beginPath();
        ctx.moveTo(x - w * 0.52, y - h * 0.70);
        ctx.lineTo(x - 5, y - h * 1.15);
        ctx.lineTo(x + 10, y - h * 0.95);
        ctx.lineTo(x - w * 0.40, y - h * 0.65);
        ctx.closePath();
        ctx.fill();

        // Cobertura de palha podre/sapé
        ctx.fillStyle = '#483a24';
        ctx.beginPath();
        ctx.moveTo(x - w * 0.50, y - h * 0.72);
        ctx.lineTo(x - 5, y - h * 1.12);
        ctx.lineTo(x - 12, y - h * 1.08);
        ctx.lineTo(x - w * 0.46, y - h * 0.68);
        ctx.closePath();
        ctx.fill();

        // Vigas e Caibros Mestres Expostos no Lado Direito (Totalmente Desabado!)
        ctx.strokeStyle = '#291b10';
        ctx.lineWidth = 3.2;

        // Viga mestra central
        ctx.beginPath();
        ctx.moveTo(x - 5, y - h * 1.15);
        ctx.lineTo(x + w * 0.48, y - h * 0.68);
        ctx.stroke();

        // Caibros quebrados apontando para cima
        ctx.beginPath();
        ctx.moveTo(x + 12, y - h * 1.02);
        ctx.lineTo(x + 24, y - h * 0.72);
        ctx.moveTo(x + 28, y - h * 0.88);
        ctx.lineTo(x + 42, y - h * 0.62);
        ctx.stroke();

        // Trepadeiras e Hera do Pântano pendendo do telhado
        ctx.strokeStyle = '#385e2b';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(x - 25, y - h * 0.70);
        ctx.quadraticCurveTo(x - 30, y - h * 0.50, x - 26, y - h * 0.35);
        ctx.moveTo(x + 18, y - h * 0.72);
        ctx.quadraticCurveTo(x + 22, y - h * 0.45, x + 16, y - h * 0.25);
        ctx.stroke();

        ctx.restore();
    }

    // ========================================================================
    // DESENHO DA CHOÇA DO PESCADOR ABANDONADA
    // ========================================================================
    function desenharChocaPescadorRealista(ctx, choca, t) {
        if (!ctx) return;
        ctx.save();
        const x = choca.x;
        const y = choca.y;
        const w = choca.w;
        const h = choca.h;

        // Choça fortemente inclinada para a direita afundando no lodo
        ctx.translate(x, y);
        ctx.rotate(0.08);

        // Sombra na água
        ctx.fillStyle = 'rgba(10, 15, 8, 0.55)';
        ctx.beginPath();
        ctx.ellipse(0, 18, w * 0.55, 20, 0, 0, Math.PI * 2);
        ctx.fill();

        // Estacas podres
        ctx.fillStyle = '#22160d';
        ctx.fillRect(-35, -5, 6, 26);
        ctx.fillRect(0, -5, 6, 26);
        ctx.fillRect(32, -5, 6, 26);

        // Limo nas estacas
        ctx.fillStyle = '#2a481c';
        ctx.fillRect(-36, 12, 8, 14);
        ctx.fillRect(-1, 12, 8, 14);
        ctx.fillRect(31, 12, 8, 14);

        // Plataforma inclinada
        ctx.fillStyle = '#3a2717';
        ctx.fillRect(-w * 0.48, -10, w * 0.96, 10);

        // Paredes de ripas carcomidas
        ctx.fillStyle = '#1c1209';
        ctx.fillRect(-w * 0.42, -h * 0.75, w * 0.84, h * 0.65);

        ctx.fillStyle = '#422e1b';
        ctx.fillRect(-w * 0.42, -h * 0.75, w * 0.84, 8);
        ctx.fillRect(-w * 0.42, -h * 0.55, w * 0.84, 8);
        ctx.fillRect(-w * 0.42, -h * 0.35, w * 0.84, 8);

        // Rede de pesca rasgada pendendo da viga
        ctx.strokeStyle = '#5a4d3b';
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        for (let rx = -20; rx <= 15; rx += 7) {
            ctx.moveTo(rx, -h * 0.55);
            ctx.lineTo(rx + 4, -h * 0.15 + (rx % 3) * 3);
        }
        ctx.stroke();

        // Telhado de palha podre furado
        ctx.fillStyle = '#312316';
        ctx.beginPath();
        ctx.moveTo(-w * 0.52, -h * 0.70);
        ctx.lineTo(0, -h * 1.10);
        ctx.lineTo(w * 0.52, -h * 0.65);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#4d3d28';
        ctx.beginPath();
        ctx.moveTo(-w * 0.48, -h * 0.72);
        ctx.lineTo(0, -h * 1.08);
        ctx.lineTo(10, -h * 1.00);
        ctx.lineTo(-w * 0.35, -h * 0.68);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }

    // ========================================================================
    // DESENHO DOS CIPRESTES-CALVOS (SWAMP BALD CYPRESS)
    // ========================================================================
    function desenharCipresteRealista(ctx, arv, t) {
        if (!ctx) return;
        ctx.save();
        const x = arv.x;
        const y = arv.y;
        const h = arv.h;
        const troncoL = arv.troncoL;

        // 1. Sombra circular escura no lodo
        ctx.fillStyle = 'rgba(10, 16, 9, 0.60)';
        ctx.beginPath();
        ctx.ellipse(x + 8, y + 8, troncoL * 1.6, troncoL * 0.75, 0, 0, Math.PI * 2);
        ctx.fill();

        // 2. Joelhos de Cipreste (raízes aéreas cônicas saindo da lama)
        const joelhos = [
            { dx: -troncoL * 1.3, dy: 4, h: 16 },
            { dx: troncoL * 1.25, dy: 6, h: 18 },
            { dx: -troncoL * 0.8, dy: 14, h: 12 },
            { dx: troncoL * 0.9, dy: 15, h: 14 }
        ];

        for (let ji = 0; ji < joelhos.length; ji++) {
            const j = joelhos[ji];
            ctx.fillStyle = '#261a10';
            ctx.beginPath();
            ctx.moveTo(x + j.dx - 4, y + j.dy);
            ctx.lineTo(x + j.dx, y + j.dy - j.h);
            ctx.lineTo(x + j.dx + 4, y + j.dy);
            ctx.closePath();
            ctx.fill();

            // Musgo na ponta do joelho
            ctx.fillStyle = '#395e28';
            ctx.beginPath();
            ctx.arc(x + j.dx, y + j.dy - j.h, 2.5, 0, Math.PI * 2);
            ctx.fill();
        }

        // 3. Tronco canelado e bulboso na base
        ctx.fillStyle = '#20160d';
        ctx.beginPath();
        ctx.moveTo(x - troncoL * 1.1, y + 6);
        ctx.quadraticCurveTo(x - troncoL * 0.5, y - h * 0.35, x - troncoL * 0.35, y - h * 0.85);
        ctx.lineTo(x + troncoL * 0.35, y - h * 0.85);
        ctx.quadraticCurveTo(x + troncoL * 0.5, y - h * 0.35, x + troncoL * 1.1, y + 6);
        ctx.closePath();
        ctx.fill();

        // Textura da casca nodosa e sulcos verticais
        ctx.fillStyle = '#332316';
        ctx.fillRect(x - troncoL * 0.25, y - h * 0.80, troncoL * 0.2, h * 0.75);
        ctx.fillStyle = '#170f08';
        ctx.fillRect(x + troncoL * 0.05, y - h * 0.80, troncoL * 0.18, h * 0.75);

        // Manchas de musgo úmido no tronco
        ctx.fillStyle = '#315424';
        ctx.fillRect(x - troncoL * 0.35, y - h * 0.40, troncoL * 0.3, 14);
        ctx.fillRect(x - troncoL * 0.6, y - 6, troncoL * 0.4, 10);

        // 4. Copa alta densa e sombria
        ctx.fillStyle = '#162813';
        ctx.beginPath();
        ctx.ellipse(x, y - h, troncoL * 2.2, h * 0.38, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#223c1d';
        ctx.beginPath();
        ctx.ellipse(x - 8, y - h - 10, troncoL * 1.8, h * 0.30, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#2d5027';
        ctx.beginPath();
        ctx.ellipse(x + 6, y - h - 22, troncoL * 1.4, h * 0.22, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    // ========================================================================
    // DESENHO DOS SALGUEIROS-CHORÕES COM BARBA-DE-VELHO (SPANISH MOSS)
    // ========================================================================
    function desenharSalgueiroRealista(ctx, arv, t) {
        if (!ctx) return;
        ctx.save();
        const x = arv.x;
        const y = arv.y;
        const h = arv.h;
        const troncoL = arv.troncoL;

        // 1. Sombra
        ctx.fillStyle = 'rgba(10, 16, 9, 0.55)';
        ctx.beginPath();
        ctx.ellipse(x + 5, y + 6, troncoL * 1.8, troncoL * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();

        // 2. Tronco retorcido e curvado
        ctx.fillStyle = '#23180f';
        ctx.beginPath();
        ctx.moveTo(x - troncoL * 0.7, y + 4);
        ctx.quadraticCurveTo(x - troncoL * 0.2, y - h * 0.4, x - troncoL * 0.4, y - h * 0.75);
        ctx.lineTo(x + troncoL * 0.3, y - h * 0.75);
        ctx.quadraticCurveTo(x + troncoL * 0.6, y - h * 0.4, x + troncoL * 0.7, y + 4);
        ctx.closePath();
        ctx.fill();

        // 3. Galhos arqueados caídos
        ctx.strokeStyle = '#23180f';
        ctx.lineWidth = 4.5;
        const galhos = [-38, -20, 0, 22, 40];
        for (let gi = 0; gi < galhos.length; gi++) {
            const gx = galhos[gi];
            ctx.beginPath();
            ctx.moveTo(x, y - h * 0.72);
            ctx.quadraticCurveTo(x + gx * 0.6, y - h * 0.88, x + gx, y - h * 0.50);
            ctx.stroke();
        }

        // 4. Cortinas de Barba-de-Velho (Spanish Moss pendente ondulando suavemente)
        const numMechas = 12;
        for (let mi = 0; mi < numMechas; mi++) {
            const mx = x - 48 + mi * 8.5;
            const altMecha = 40 + Math.sin(mi * 1.5) * 16;
            const balanco = Math.sin(t * 1.6 + mi * 0.6) * 3.5;

            ctx.strokeStyle = (mi % 2 === 0 ? 'rgba(95, 125, 90, 0.65)' : 'rgba(75, 105, 70, 0.75)');
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.moveTo(mx, y - h * 0.70);
            ctx.quadraticCurveTo(mx + balanco * 0.7, y - h * 0.70 + altMecha * 0.5, mx + balanco, y - h * 0.70 + altMecha);
            ctx.stroke();

            // Ponta desfiada
            ctx.strokeStyle = 'rgba(110, 145, 105, 0.55)';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(mx + balanco, y - h * 0.70 + altMecha - 6);
            ctx.lineTo(mx + balanco + 3, y - h * 0.70 + altMecha + 4);
            ctx.stroke();
        }

        // 5. Folhagem do topo
        ctx.fillStyle = '#1e381b';
        ctx.beginPath();
        ctx.ellipse(x, y - h * 0.82, troncoL * 2.4, h * 0.30, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    // ========================================================================
    // DESENHO DOS TRONCOS MORTOS E OCOS TOMBADOS
    // ========================================================================
    function desenharTroncoMortoRealista(ctx, tr, t) {
        if (!ctx) return;
        ctx.save();
        ctx.translate(tr.x, tr.y);
        ctx.rotate(tr.ang);

        // Sombra
        ctx.fillStyle = 'rgba(10, 15, 8, 0.50)';
        ctx.beginPath();
        ctx.ellipse(0, tr.alt * 0.6, tr.comp * 0.55, tr.alt * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();

        // Tronco apodrecido
        ctx.fillStyle = '#26190f';
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(-tr.comp / 2, -tr.alt / 2, tr.comp, tr.alt, 6)
                      : ctx.rect(-tr.comp / 2, -tr.alt / 2, tr.comp, tr.alt);
        ctx.fill();

        // Oco escuro no topo/lateral
        ctx.fillStyle = '#110b06';
        ctx.beginPath();
        ctx.ellipse(-tr.comp * 0.42, 0, 5, tr.alt * 0.38, 0, 0, Math.PI * 2);
        ctx.fill();

        // Fissuras e musgo
        ctx.fillStyle = '#385826';
        ctx.fillRect(-tr.comp * 0.2, -tr.alt / 2, tr.comp * 0.45, 4);

        // Fungos orelha-de-pau no tronco
        if (tr.fungos) {
            ctx.fillStyle = '#8a5a36';
            ctx.beginPath();
            ctx.arc(tr.comp * 0.1, -tr.alt / 2 - 2, 6, Math.PI, Math.PI * 2);
            ctx.arc(tr.comp * 0.22, -tr.alt / 2 - 1, 4.5, Math.PI, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#d4a373';
            ctx.beginPath();
            ctx.arc(tr.comp * 0.1, -tr.alt / 2 - 2, 4, Math.PI, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    // ========================================================================
    // DESENHO DOS JUNCOS E TABOAS (CATTAILS)
    // ========================================================================
    function desenharTaboasRealistas(ctx, tab, t) {
        if (!ctx) return;
        ctx.save();
        const x = tab.x;
        const y = tab.y;

        for (let i = 0; i < tab.count; i++) {
            const hTab = 28 + (i % 4) * 6;
            const dx = (i - tab.count / 2) * 5;
            const sway = Math.sin(t * 2.2 + i * 0.7 + tab.seed) * 3.0;

            // Haste verde escura
            ctx.strokeStyle = '#29481e';
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.moveTo(x + dx, y);
            ctx.quadraticCurveTo(x + dx + sway * 0.5, y - hTab * 0.5, x + dx + sway, y - hTab);
            ctx.stroke();

            // Espiga marrom aveludada característica da taboa
            ctx.strokeStyle = '#432613';
            ctx.lineWidth = 3.6;
            ctx.beginPath();
            ctx.moveTo(x + dx + sway * 0.85, y - hTab + 6);
            ctx.lineTo(x + dx + sway, y - hTab + 16);
            ctx.stroke();
        }
        ctx.restore();
    }

    // ========================================================================
    // DESENHO DE COGUMELOS BIOLUMINESCENTES
    // ========================================================================
    function desenharCogumeloRealista(ctx, cog, t) {
        if (!ctx) return;
        ctx.save();
        const x = cog.x;
        const y = cog.y;
        const r = cog.r;

        // Brilho bioluminescente suave
        if (cog.brilho) {
            const pulsar = 0.8 + Math.sin(t * 4.0) * 0.2;
            const gGlow = ctx.createRadialGradient(x, y - r, 1, x, y - r, 18 * pulsar);
            gGlow.addColorStop(0, cog.cor);
            gGlow.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = gGlow;
            ctx.beginPath();
            ctx.arc(x, y - r, 18 * pulsar, 0, Math.PI * 2);
            ctx.fill();
        }

        // Haste branca/marfim
        ctx.fillStyle = '#e8dec8';
        ctx.fillRect(x - 1.5, y - r * 1.5, 3, r * 1.5);

        // Chapéu do cogumelo
        ctx.fillStyle = cog.cor;
        ctx.beginPath();
        ctx.arc(x, y - r * 1.5, r, Math.PI, Math.PI * 2);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }

    // ========================================================================
    // EXPORTAÇÃO ISOMÓRFICA
    // ========================================================================
    const api = {
        TILE: TILE,
        TESTE_X0: TESTE_X0,
        TESTE_X1: TESTE_X1,
        TESTE_Y1: TESTE_Y1,
        COLS: COLS,
        ROWS: ROWS,
        ALT_LIVRE: ALT_LIVRE,
        ALT_PAREDE: ALT_PAREDE,
        PORTAL_RETORNO: PORTAL_RETORNO,
        PONTO_CHEGADA: PONTO_CHEGADA,
        CABANA_PRINCIPAL: CABANA_PRINCIPAL,
        CHOCA_PESCADOR: CHOCA_PESCADOR,
        CANOA_AFUNDADA: CANOA_AFUNDADA,
        ARVORES_PANTANO: ARVORES_PANTANO,
        TRONCOS_MORTOS: TRONCOS_MORTOS,
        TABOAS: TABOAS,
        COGUMELOS: COGUMELOS,
        FOGOS_FATUOS: FOGOS_FATUOS,
        gerarGrid: gerarGrid,
        grid: function () { if (!grid) gerarGrid(); return grid; },
        isTesteVisual: isTesteVisual,
        colide: colide,
        colideProjetil: colideProjetil,
        infoPortalTeste: infoPortalTeste,
        desenharCenarioTesteVisual: desenharCenarioTesteVisual,
        coletarTestevisualSortables: coletarTestevisualSortables,
        onUpdatePosicao: onUpdatePosicao
    };

    if (typeof window !== 'undefined') {
        gerarGrid();
        chainAnterior = global.chainMapas;
        global.chainMapas = { onUpdatePosicao: onUpdatePosicao };
        global.LARGURA_TESTE_VISUAL = TESTE_X0;
        global.FIM_TESTE_VISUAL = TESTE_X1;
        global.ALTO_TESTE_VISUAL = TESTE_Y1;
        global.desenharCenarioTesteVisual = desenharCenarioTesteVisual;
        global.coletarTestevisualSortables = coletarTestevisualSortables;

        const antColide = global.colideMapaAtivo;
        global.colideMapaAtivo = function (x, y, raio) {
            if (global.currentMap === 'testevisual') return !isTesteVisual(x, y) || colide(x, y, raio);
            return typeof antColide === 'function' ? antColide(x, y, raio) : false;
        };

        const antColideProj = global.colideProjetilMapaAtivo;
        global.colideProjetilMapaAtivo = function (x, y) {
            if (global.currentMap === 'testevisual') return !isTesteVisual(x, y) || colideProjetil(x, y);
            return typeof antColideProj === 'function' ? antColideProj(x, y) : false;
        };

        global.mapaTesteVisual = api;
    }

    if (typeof module !== 'undefined' && module.exports) {
        if (!grid) gerarGrid();
        module.exports = api;
    }

})(typeof window !== 'undefined' ? window : globalThis);
