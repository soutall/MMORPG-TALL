// ============================================================================
// mapa_teste_visual.js — Arena Visual (Bioma de Pântano Realista) v1.64.0
// Engine Gráfica de Alto Desempenho PixiJS (WebGL) + Fallback Canvas 2D
// - Terreno Orgânico Contínuo sem tiles/quadradinhos (Mesh / Bezier Surfaces)
// - Shader GLSL de Água com Deformação de Ondas, Cáusticas e Profundidade
// - Iluminação Dinâmica 2D em Tempo Real (ADD Blend Mode, Flicker e Partículas)
// - Projeção Dinâmica de Sombras 2D em Tempo Real (Shadow Volumes Geométricos)
// - Módulo Isomórfico: Seguro para Node.js (server.js) e Navegador (window)
// Coordenadas: x em [72000, 73280), y em [0, 960) -> 1280px x 960px
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
    const PORTAL_RETORNO = null; // Portal de retorno para a cidade desativado no design atual.
    // Ponto de chegada quando o jogador teleporta para cá
    const PONTO_CHEGADA = { x: 72660, y: 480 };

    // Fogueira Ritualística da Bruxa (Ponto de Luz e Sombra Dinâmica)
    const FOGUEIRA_RITUAL = { x: 72720, y: 400, rCol: 20 };

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
        { x: 72320, y: 220, tipo: 'cipreste', rCol: 22, h: 140, troncoL: 26, seed: 1.1 },
        { x: 72460, y: 780, tipo: 'cipreste', rCol: 20, h: 125, troncoL: 24, seed: 2.4 },
        { x: 73000, y: 190, tipo: 'cipreste', rCol: 24, h: 145, troncoL: 28, seed: 3.7 },
        { x: 73120, y: 530, tipo: 'cipreste', rCol: 21, h: 130, troncoL: 25, seed: 4.9 },
        { x: 72680, y: 840, tipo: 'cipreste', rCol: 23, h: 138, troncoL: 27, seed: 5.8 },
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

    // 6. Tufos de Taboas / Juncos Altos (Cattails)
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

    // 8. Efeitos Atmosféricos: Bolhas de Gás Metano
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
        { x: 72420, y: 360, vx: 0.3, vy: 0.2, raioOrb: 35, corHex: 0x2ec4b6, cor: 'rgba(46, 196, 182, 0.85)', seed: 1 },
        { x: 72640, y: 520, vx: -0.25, vy: 0.35, raioOrb: 45, corHex: 0x06d6a0, cor: 'rgba(6, 214, 160, 0.85)', seed: 2 },
        { x: 72820, y: 400, vx: 0.4, vy: -0.2, raioOrb: 40, corHex: 0x9b5de5, cor: 'rgba(155, 93, 229, 0.80)', seed: 3 },
        { x: 72980, y: 600, vx: -0.3, vy: -0.3, raioOrb: 38, corHex: 0x2ec4b6, cor: 'rgba(46, 196, 182, 0.85)', seed: 4 },
        { x: 72560, y: 720, vx: 0.35, vy: 0.25, raioOrb: 42, corHex: 0xffd166, cor: 'rgba(255, 209, 102, 0.80)', seed: 5 },
        { x: 73100, y: 420, vx: -0.2, vy: 0.4, raioOrb: 36, corHex: 0x06d6a0, cor: 'rgba(6, 214, 160, 0.85)', seed: 6 }
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
    // GERAÇÃO PROCEDURAL DO GRID DE COLISÃO DO PÂNTANO (Compatível com Server)
    // ========================================================================
    function gerarGrid() {
        if (grid) return grid;
        grid = [];

        const lago1 = { cx: 21, cy: 11, rx: 7.5, ry: 4.8 };
        const lago2 = { cx: 24, cy: 16, rx: 5.5, ry: 4.0 };

        for (let l = 0; l < ROWS; l++) {
            const row = [];
            for (let c = 0; c < COLS; c++) {
                let tipo = 'lodo';
                let alt = ALT_LIVRE;

                if (l === 0 || l === ROWS - 1 || c === 0 || c === COLS - 1) {
                    tipo = 'muralha_cipreste';
                    alt = ALT_PAREDE;
                } else {
                    const d1 = Math.hypot((c - lago1.cx) / lago1.rx, (l - lago1.cy) / lago1.ry);
                    const d2 = Math.hypot((c - lago2.cx) / lago2.rx, (l - lago2.cy) / lago2.ry);
                    const distAgua = Math.min(d1, d2);

                    const naPassarelaPrincipal = (l === 12 && c >= 2 && c <= 16);
                    const naPassarelaNorte = (c === 16 && l >= 8 && l <= 12);
                    const naPassarelaSul = (c === 16 && l >= 12 && l <= 16) || (l === 16 && c >= 16 && c <= 22);
                    const ehPassarela = (naPassarelaPrincipal || naPassarelaNorte || naPassarelaSul);

                    if (ehPassarela) {
                        tipo = 'passarela';
                        alt = ALT_LIVRE;
                    } else if (distAgua < 0.75) {
                        tipo = 'agua_funda';
                        alt = ALT_PAREDE;
                    } else if (distAgua < 1.0) {
                        tipo = 'agua_turva';
                        alt = ALT_PAREDE;
                    } else if (distAgua < 1.25) {
                        tipo = 'margem_lodo';
                        alt = ALT_LIVRE;
                    } else {
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
                row.push({ tipo: tipo, alt: alt });
            }
            grid.push(row);
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

        if (x - raio < TESTE_X0 + 40 || x + raio >= TESTE_X1 - 40 || y - raio < 40 || y + raio >= TESTE_Y1 - 40) {
            return true;
        }

        const c0 = Math.max(0, Math.floor((x - TESTE_X0 - raio) / TILE));
        const c1 = Math.min(COLS - 1, Math.floor((x - TESTE_X0 + raio) / TILE));
        const l0 = Math.max(0, Math.floor((y - raio) / TILE));
        const l1 = Math.min(ROWS - 1, Math.floor((y + raio) / TILE));

        for (let l = l0; l <= l1; l++) {
            for (let c = c0; c <= c1; c++) {
                if (grid[l][c].alt >= ALT_PAREDE) return true;
            }
        }

        for (let i = 0; i < ARVORES_PANTANO.length; i++) {
            const arv = ARVORES_PANTANO[i];
            if (Math.hypot(x - arv.x, y - arv.y) < (arv.rCol + raio)) return true;
        }

        for (let i = 0; i < TRONCOS_MORTOS.length; i++) {
            const tr = TRONCOS_MORTOS[i];
            if (Math.hypot(x - tr.x, y - tr.y) < (tr.rCol + raio)) return true;
        }

        if (Math.hypot(x - CABANA_PRINCIPAL.x, y - (CABANA_PRINCIPAL.y - 10)) < (CABANA_PRINCIPAL.rCol + raio)) {
            return true;
        }

        if (Math.hypot(x - CHOCA_PESCADOR.x, y - (CHOCA_PESCADOR.y - 10)) < (CHOCA_PESCADOR.rCol + raio)) {
            return true;
        }

        // Colisão com a fogueira ritual
        if (Math.hypot(x - FOGUEIRA_RITUAL.x, y - FOGUEIRA_RITUAL.y) < (FOGUEIRA_RITUAL.rCol + raio)) {
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

        if (Math.hypot(x - CABANA_PRINCIPAL.x, y - CABANA_PRINCIPAL.y) < CABANA_PRINCIPAL.rCol) return true;
        if (Math.hypot(x - CHOCA_PESCADOR.x, y - CHOCA_PESCADOR.y) < CHOCA_PESCADOR.rCol) return true;
        if (Math.hypot(x - FOGUEIRA_RITUAL.x, y - FOGUEIRA_RITUAL.y) < FOGUEIRA_RITUAL.rCol) return true;

        return false;
    }

    // ========================================================================
    // TRANSIÇÃO E PORTAIS
    // ========================================================================
    function infoPortalTeste(x, y) {
        if (!isTesteVisual(x, y)) return null;
        if (!PORTAL_RETORNO) return null;
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
    // MOTOR GRÁFICO PIXIJS (WEBGL) DE ALTO DESEMPENHO
    // ========================================================================
    let pixiApp = null;
    let pixiIniciado = false;
    let worldContainer = null;
    let layerTerrain = null;
    let layerWater = null;
    let layerShadows = null;
    let layerLights = null;
    let layerAtmosphere = null;
    let waterFilter = null;
    let waterGraphics = null;
    let fogueiraEmbers = [];
    let nevoaSprite1 = null;
    let nevoaSprite2 = null;

    // Fragment Shader GLSL customizado para a água do pântano
    const WATER_FRAG_SRC = `
        precision mediump float;
        varying vec2 vTextureCoord;
        uniform sampler2D uSampler;
        uniform float uTime;

        void main(void) {
            vec2 uv = vTextureCoord;
            // Deformação senoidal composta em 2 frequências
            float w1 = sin(uv.x * 26.0 + uTime * 1.8) * cos(uv.y * 22.0 + uTime * 1.3);
            float w2 = sin(uv.x * 48.0 - uTime * 2.2 + w1) * sin(uv.y * 42.0 + uTime * 1.7);
            vec2 coordDistorcida = uv + vec2(w1, w2) * 0.007;

            vec4 corBase = texture2D(uSampler, coordDistorcida);

            // Ondulação de reflexo e cáusticas esverdeadas do pântano
            float c1 = sin(uv.x * 38.0 + w2 * 3.0 + uTime * 1.5);
            float c2 = cos(uv.y * 38.0 + w1 * 3.0 - uTime * 1.2);
            float caustica = pow(max(0.0, c1 * c2), 3.0) * 0.35;

            // Gradação de profundidade pantanosa turva
            vec3 corProfunda = vec3(0.05, 0.12, 0.07);
            vec3 corReflexo = vec3(0.18, 0.48, 0.30);
            vec3 resultado = mix(corBase.rgb, corProfunda, 0.20) + corReflexo * caustica;

            gl_FragColor = vec4(resultado, corBase.a);
        }
    `;

    function inicializarPixi() {
        if (pixiIniciado || typeof window === 'undefined' || typeof window.PIXI === 'undefined') return;

        const pixiCanvas = document.getElementById('canvas-pixi-visual');
        if (!pixiCanvas) return;

        try {
            const PIXI = window.PIXI;

            pixiApp = new PIXI.Application({
                view: pixiCanvas,
                width: window.innerWidth || 800,
                height: window.innerHeight || 600,
                backgroundAlpha: 0,
                antialias: true,
                autoDensity: true,
                resolution: Math.min(window.devicePixelRatio || 1, 2),
                powerPreference: 'high-performance'
            });

            // Container principal de mundo (sincronizado 1:1 com a câmera do jogo)
            worldContainer = new PIXI.Container();
            pixiApp.stage.addChild(worldContainer);

            // Camadas estruturadas do cenário
            layerTerrain = new PIXI.Container();
            layerWater = new PIXI.Container();
            layerShadows = new PIXI.Graphics();
            layerLights = new PIXI.Container();
            layerLights.blendMode = PIXI.BLEND_MODES.ADD; // WebGL Adição Pura
            layerAtmosphere = new PIXI.Container();

            worldContainer.addChild(layerTerrain);
            worldContainer.addChild(layerWater);
            worldContainer.addChild(layerShadows);
            worldContainer.addChild(layerLights);
            worldContainer.addChild(layerAtmosphere);

            // 1. CONSTRUIR TERRENO ORGÂNICO CONTÍNUO (Fim dos quadradinhos!)
            construirTerrenoOrganicoPixi(PIXI);

            // 2. CONSTRUIR LAGO REALISTA COM SHADER GLSL
            construirAguaComShaderPixi(PIXI);

            // 3. INICIALIZAR SISTEMA DE PARTÍCULAS DE BRASAS DA FOGUEIRA
            inicializarBrasasPixi();

            // 4. CONSTRUIR NÉVOA VOLUMÉTRICA DERIVANTE
            construirNevoaPixi(PIXI);

            pixiIniciado = true;
            console.log('[PixiJS WebGL] Arena Visual inicializada com sucesso com poder total de luzes, sombras e shaders.');
        } catch (err) {
            console.error('[PixiJS WebGL] Falha ao inicializar PixiJS:', err);
            pixiIniciado = false;
        }
    }

    // ========================================================================
    // CONSTRUÇÃO DO TERRENO ORGÂNICO CONTÍNUO (SEM QUADRADINHOS)
    // ========================================================================
    function construirTerrenoOrganicoPixi(PIXI) {
        const g = new PIXI.Graphics();
        layerTerrain.addChild(g);

        // A. Fundo contínuo de turfa e lodo negro do pântano
        g.beginFill(0x101a0e, 1.0);
        g.drawRect(TESTE_X0, 0, TESTE_X1 - TESTE_X0, TESTE_Y1);
        g.endFill();

        // B. Manchas orgânicas amplas de lodo úmido com curvas suaves
        const manchasLodo = [
            { cx: 72320, cy: 300, rx: 220, ry: 160, cor: 0x162413 },
            { cx: 72580, cy: 380, rx: 260, ry: 180, cor: 0x132011 },
            { cx: 72400, cy: 720, rx: 280, ry: 190, cor: 0x182815 },
            { cx: 72740, cy: 820, rx: 250, ry: 150, cor: 0x142212 },
            { cx: 73080, cy: 260, rx: 210, ry: 170, cor: 0x162614 },
            { cx: 73120, cy: 780, rx: 230, ry: 160, cor: 0x132011 }
        ];

        for (let i = 0; i < manchasLodo.length; i++) {
            const m = manchasLodo[i];
            g.beginFill(m.cor, 0.85);
            g.drawEllipse(m.cx, m.cy, m.rx, m.ry);
            g.endFill();
        }

        // C. Manchas orgânicas de musgo rasteiro e turfa seca
        const manchasMusgo = [
            { cx: 72260, cy: 480, rx: 140, ry: 110, cor: 0x27421b },
            { cx: 72480, cy: 260, rx: 160, ry: 120, cor: 0x223c17 },
            { cx: 72520, cy: 620, rx: 150, ry: 100, cor: 0x2b481e },
            { cx: 72720, cy: 220, rx: 180, ry: 90, cor: 0x305222 },
            { cx: 72980, cy: 210, rx: 130, ry: 95, cor: 0x253e19 },
            { cx: 72680, cy: 520, rx: 120, ry: 80, cor: 0x1f3615 }
        ];

        for (let i = 0; i < manchasMusgo.length; i++) {
            const m = manchasMusgo[i];
            g.beginFill(m.cor, 0.75);
            g.drawEllipse(m.cx, m.cy, m.rx, m.ry);
            g.endFill();
            // Núcleo mais vivo do musgo
            g.beginFill(0x385c27, 0.50);
            g.drawEllipse(m.cx, m.cy, m.rx * 0.65, m.ry * 0.65);
            g.endFill();
        }

        // D. Trilha de terra batida e lodo pisoteado (Portal -> Cabana -> Choça)
        const trilha = new PIXI.Graphics();
        trilha.lineStyle(42, 0x1d2817, 0.65);
        trilha.moveTo(72160, 480);
        trilha.bezierCurveTo(72360, 480, 72540, 440, 72720, 395); // Até a fogueira/cabana
        trilha.moveTo(72720, 395);
        trilha.bezierCurveTo(72780, 460, 72840, 560, 72920, 640); // Até a choça
        layerTerrain.addChild(trilha);

        // E. Raízes gigantes de cipreste serpenteando pelo solo
        const raizes = new PIXI.Graphics();
        for (let i = 0; i < ARVORES_PANTANO.length; i++) {
            const arv = ARVORES_PANTANO[i];
            raizes.lineStyle(6, 0x20150d, 0.9);
            raizes.moveTo(arv.x, arv.y);
            raizes.lineTo(arv.x + Math.cos(arv.seed * 3) * 45, arv.y + Math.sin(arv.seed * 3) * 35);
            raizes.lineStyle(4, 0x2b1d12, 0.8);
            raizes.moveTo(arv.x, arv.y);
            raizes.lineTo(arv.x - Math.cos(arv.seed * 2) * 40, arv.y + Math.sin(arv.seed * 2) * 40);
        }
        layerTerrain.addChild(raizes);

        // F. Passarela de Madeira Podre (Boardwalk contínuo e orgânico)
        const pranchas = new PIXI.Graphics();
        // Segmento horizontal oeste-leste
        for (let px = 72180; px <= 72660; px += 18) {
            const py = 480;
            const rot = (hash2(px, 12, 1) - 0.5) * 0.12;
            const larg = 36;
            const esp = 14;

            pranchas.beginFill(0x181009, 0.85); // Sombra inferior
            pranchas.drawRect(px - 1, py - larg / 2 + 3, esp + 2, larg);
            pranchas.endFill();

            pranchas.beginFill(0x3e2b1b, 1.0); // Madeira envelhecida
            pranchas.drawRect(px, py - larg / 2, esp, larg);
            pranchas.endFill();

            pranchas.beginFill(0x27190e, 0.6); // Fissuras
            pranchas.drawRect(px + 4, py - larg / 2 + 2, 2, larg - 4);
            pranchas.endFill();

            // Pregos enferrujados
            pranchas.beginFill(0x110a05, 0.9);
            pranchas.drawCircle(px + 3, py - larg / 2 + 4, 1.5);
            pranchas.drawCircle(px + 3, py + larg / 2 - 4, 1.5);
            pranchas.endFill();
        }
        layerTerrain.addChild(pranchas);
    }

    // ========================================================================
    // CONSTRUÇÃO DA ÁGUA COM SHADER GLSL DE ALTO DESEMPENHO
    // ========================================================================
    function construirAguaComShaderPixi(PIXI) {
        waterGraphics = new PIXI.Graphics();
        layerWater.addChild(waterGraphics);

        // Bacia contínua e orgânica do Lago Central do Pântano
        waterGraphics.beginFill(0x0c1b12, 0.95);
        // Lago superior da Bruxa
        waterGraphics.drawEllipse(72840, 460, 240, 150);
        // Lago inferior do Pescador
        waterGraphics.drawEllipse(72960, 660, 210, 140);
        // Conexão curva entre os lagos
        waterGraphics.drawEllipse(72890, 550, 160, 130);
        waterGraphics.endFill();

        // Margem de lodo úmido ao redor da água
        const margem = new PIXI.Graphics();
        margem.lineStyle(16, 0x182a17, 0.7);
        margem.drawEllipse(72840, 460, 246, 156);
        margem.drawEllipse(72960, 660, 216, 146);
        layerTerrain.addChild(margem);

        // Aplicação do Filtro Shader GLSL customizado
        try {
            waterFilter = new PIXI.Filter(null, WATER_FRAG_SRC, {
                uTime: 0.0
            });
            layerWater.filters = [waterFilter];
        } catch (e) {
            console.warn('[PixiJS WebGL] Shader de água não compilou, usando modo padrão:', e);
        }

        // Nenúfares e vitórias-régias flutuantes sobre a água
        const nenufares = [
            { x: 72780, y: 460, r: 15 },
            { x: 72830, y: 440, r: 12 },
            { x: 72740, y: 520, r: 18 },
            { x: 72880, y: 490, r: 14 },
            { x: 72960, y: 550, r: 16 },
            { x: 72910, y: 380, r: 13 },
            { x: 73020, y: 430, r: 15 },
            { x: 72780, y: 640, r: 14 },
            { x: 72840, y: 670, r: 17 }
        ];

        const folhagem = new PIXI.Graphics();
        for (let i = 0; i < nenufares.length; i++) {
            const n = nenufares[i];
            folhagem.beginFill(0x274a1e, 0.95);
            folhagem.drawCircle(n.x, n.y, n.r);
            folhagem.endFill();
            folhagem.beginFill(0x3d6e2e, 0.85);
            folhagem.drawCircle(n.x - 2, n.y - 2, n.r * 0.6);
            folhagem.endFill();
            // Florzinha branca/amarela no centro
            if (i % 2 === 0) {
                folhagem.beginFill(0xfffae0, 1.0);
                folhagem.drawCircle(n.x, n.y, 4);
                folhagem.endFill();
            }
        }
        layerWater.addChild(folhagem);

        // Canoa semi-afundada
        const canoa = new PIXI.Graphics();
        canoa.beginFill(0x2a1a0f, 0.9);
        canoa.drawEllipse(CANOA_AFUNDADA.x, CANOA_AFUNDADA.y, CANOA_AFUNDADA.comprimento / 2, CANOA_AFUNDADA.largura / 2);
        canoa.endFill();
        canoa.beginFill(0x0e1b12, 0.85); // Água dentro da canoa furada
        canoa.drawEllipse(CANOA_AFUNDADA.x + 4, CANOA_AFUNDADA.y + 2, CANOA_AFUNDADA.comprimento / 2 - 5, CANOA_AFUNDADA.largura / 2 - 4);
        canoa.endFill();
        layerWater.addChild(canoa);
    }

    // ========================================================================
    // SISTEMA DE PARTÍCULAS: BRASAS E FAGULHAS DA FOGUEIRA
    // ========================================================================
    function inicializarBrasasPixi() {
        fogueiraEmbers = [];
        for (let i = 0; i < 45; i++) {
            fogueiraEmbers.push({
                x: FOGUEIRA_RITUAL.x + (Math.random() - 0.5) * 26,
                y: FOGUEIRA_RITUAL.y + (Math.random() - 0.5) * 16,
                vx: (Math.random() - 0.5) * 18,
                vy: -35 - Math.random() * 45,
                vida: Math.random(),
                maxVida: 1.2 + Math.random() * 1.5,
                tam: 1.5 + Math.random() * 2.5,
                cor: Math.random() > 0.3 ? 0xff7700 : 0xffdd44
            });
        }
    }

    function atualizarBrasasPixi(dt, gLights) {
        for (let i = 0; i < fogueiraEmbers.length; i++) {
            const p = fogueiraEmbers[i];
            p.vida += dt;
            if (p.vida >= p.maxVida) {
                p.vida = 0;
                p.x = FOGUEIRA_RITUAL.x + (Math.random() - 0.5) * 26;
                p.y = FOGUEIRA_RITUAL.y + (Math.random() - 0.5) * 14;
            }
            const prog = p.vida / p.maxVida;
            const curX = p.x + Math.sin(prog * 6.0 + i) * 12 + p.vx * prog;
            const curY = p.y + p.vy * prog;
            const alpha = Math.sin(prog * Math.PI) * 0.9;

            gLights.beginFill(p.cor, alpha);
            gLights.drawCircle(curX, curY, p.tam * (1.0 - prog * 0.5));
            gLights.endFill();
        }
    }

    // ========================================================================
    // CONSTRUÇÃO DA NÉVOA VOLUMÉTRICA DERIVANTE
    // ========================================================================
    function construirNevoaPixi(PIXI) {
        nevoaSprite1 = new PIXI.Graphics();
        nevoaSprite2 = new PIXI.Graphics();
        layerAtmosphere.addChild(nevoaSprite1);
        layerAtmosphere.addChild(nevoaSprite2);
    }

    function renderizarNevoaVolumetrica(t) {
        if (!nevoaSprite1 || !nevoaSprite2) return;
        nevoaSprite1.clear();
        nevoaSprite2.clear();

        // Camada 1: Deriva lenta de leste para oeste
        const offX1 = (t * 18) % 300;
        nevoaSprite1.beginFill(0x8cb89a, 0.08);
        for (let px = TESTE_X0 - 200; px < TESTE_X1 + 200; px += 280) {
            const py = 350 + Math.sin(t * 0.8 + px * 0.005) * 60;
            nevoaSprite1.drawEllipse(px + offX1, py, 200, 75);
        }
        nevoaSprite1.endFill();

        // Camada 2: Deriva mais baixa sobre a lagoa
        const offX2 = (t * 26) % 360;
        nevoaSprite2.beginFill(0x73a884, 0.06);
        for (let px = TESTE_X0 - 150; px < TESTE_X1 + 250; px += 340) {
            const py = 650 + Math.cos(t * 0.6 + px * 0.004) * 80;
            nevoaSprite2.drawEllipse(px - offX2, py, 260, 90);
        }
        nevoaSprite2.endFill();
    }

    // ========================================================================
    // PROJEÇÃO DINÂMICA DE SOMBRAS 2D EM TEMPO REAL (SHADOW VOLUMES GEOMÉTRICOS)
    // ========================================================================
    function renderizarSombrasDinamicas(luzesAtivas) {
        if (!layerShadows) return;
        layerShadows.clear();

        // Lista de obstáculos que bloqueiam a luz e projetam sombras
        const oclusores = [];

        // Árvores de cipreste e salgueiros
        for (let i = 0; i < ARVORES_PANTANO.length; i++) {
            const arv = ARVORES_PANTANO[i];
            oclusores.push({ x: arv.x, y: arv.y, r: arv.rCol * 1.1 });
        }

        // Troncos mortos
        for (let i = 0; i < TRONCOS_MORTOS.length; i++) {
            const tr = TRONCOS_MORTOS[i];
            oclusores.push({ x: tr.x, y: tr.y, r: tr.rCol * 1.2 });
        }

        // Cabana da Bruxa (Grande volume de sombra)
        oclusores.push({ x: CABANA_PRINCIPAL.x, y: CABANA_PRINCIPAL.y, r: CABANA_PRINCIPAL.rCol * 1.35 });

        // Choça do Pescador
        oclusores.push({ x: CHOCA_PESCADOR.x, y: CHOCA_PESCADOR.y, r: CHOCA_PESCADOR.rCol * 1.25 });

        // Para cada fonte de luz ativa (Fogueira e Lanterna do Jogador)
        for (let li = 0; li < luzesAtivas.length; li++) {
            const luz = luzesAtivas[li];
            const lx = luz.x;
            const ly = luz.y;
            const alcance = luz.raio || 250;

            for (let oi = 0; oi < oclusores.length; oi++) {
                const oc = oclusores[oi];
                const dx = oc.x - lx;
                const dy = oc.y - ly;
                const dist = Math.hypot(dx, dy);

                // Oclusor fora do alcance da luz -> não projeta sombra
                if (dist > alcance || dist < 12) continue;

                // Ângulo central do oclusor em relação à luz
                const ang = Math.atan2(dy, dx);
                const r = oc.r;

                // Dois pontos tangentes na borda do oclusor
                const p1x = oc.x + Math.cos(ang + Math.PI / 2) * r;
                const p1y = oc.y + Math.sin(ang + Math.PI / 2) * r;
                const p2x = oc.x + Math.cos(ang - Math.PI / 2) * r;
                const p2y = oc.y + Math.sin(ang - Math.PI / 2) * r;

                // Comprimento da sombra projetada (mais perto da luz = sombra mais longa)
                const compSombra = Math.min(320, (alcance - dist) * 1.6 + 60);

                // Vetores unitários de projeção
                const d1x = (p1x - lx) / Math.hypot(p1x - lx, p1y - ly);
                const d1y = (p1y - ly) / Math.hypot(p1x - lx, p1y - ly);
                const d2x = (p2x - lx) / Math.hypot(p2x - lx, p2y - ly);
                const d2y = (p2y - ly) / Math.hypot(p2x - lx, p2y - ly);

                const p3x = p2x + d2x * compSombra;
                const p3y = p2y + d2y * compSombra;
                const p4x = p1x + d1x * compSombra;
                const p4y = p1y + d1y * compSombra;

                // Desenhar o polígono de sombra projetado
                const alphaSombra = Math.max(0.35, Math.min(0.68, 1.0 - (dist / alcance) * 0.7));
                layerShadows.beginFill(0x000000, alphaSombra);
                layerShadows.moveTo(p1x, p1y);
                layerShadows.lineTo(p2x, p2y);
                layerShadows.lineTo(p3x, p3y);
                layerShadows.lineTo(p4x, p4y);
                layerShadows.closePath();
                layerShadows.endFill();
            }
        }
    }

    // ========================================================================
    // MOTOR DE ILUMINAÇÃO DINÂMICA 2D EM TEMPO REAL (ADD BLEND MODE)
    // ========================================================================
    function renderizarIluminacaoDinamica(t, dt) {
        if (!layerLights) return;

        // Limpar os gráficos de luz do frame anterior
        layerLights.removeChildren();
        const gLights = new window.PIXI.Graphics();
        layerLights.addChild(gLights);

        const luzesParaSombras = [];

        // 1. FOGUEIRA RITUALÍSTICA DA BRUXA (Flicker Orgânico em Múltiplas Frequências)
        const flicker = Math.sin(t * 13.5) * 8.0 + Math.sin(t * 22.3) * 5.0 + Math.sin(t * 7.1) * 11.0;
        const raioFogueira = 230 + flicker;

        // Halos concêntricos quentes com Blend Aditivo WebGL
        gLights.beginFill(0x5a1804, 0.16); // Halo atmosférico carmesim amplo
        gLights.drawCircle(FOGUEIRA_RITUAL.x, FOGUEIRA_RITUAL.y, raioFogueira * 1.5);
        gLights.endFill();

        gLights.beginFill(0xcc3300, 0.32); // Halo intermediário âmbar/vermelho
        gLights.drawCircle(FOGUEIRA_RITUAL.x, FOGUEIRA_RITUAL.y, raioFogueira);
        gLights.endFill();

        gLights.beginFill(0xff7700, 0.55); // Fogo dourado vibrante
        gLights.drawCircle(FOGUEIRA_RITUAL.x, FOGUEIRA_RITUAL.y, raioFogueira * 0.58);
        gLights.endFill();

        gLights.beginFill(0xffea9f, 0.90); // Núcleo superaquecido branco-amarelado
        gLights.drawCircle(FOGUEIRA_RITUAL.x, FOGUEIRA_RITUAL.y, 32 + Math.sin(t * 18.0) * 4);
        gLights.endFill();

        luzesParaSombras.push({ x: FOGUEIRA_RITUAL.x, y: FOGUEIRA_RITUAL.y, raio: raioFogueira * 1.25 });

        // Atualizar e renderizar brasas ardentes voando
        atualizarBrasasPixi(dt, gLights);

        // 2. LANTERNA DA VARANDA DA CABANA
        const pulsoVaranda = 0.9 + Math.sin(t * 3.2) * 0.1;
        const lanX = 72685, lanY = 290;
        gLights.beginFill(0xffaa22, 0.24 * pulsoVaranda);
        gLights.drawCircle(lanX, lanY, 135 * pulsoVaranda);
        gLights.endFill();
        gLights.beginFill(0xffea77, 0.65 * pulsoVaranda);
        gLights.drawCircle(lanX, lanY, 45 * pulsoVaranda);
        gLights.endFill();

        // 3. LANTERNA DA CHOÇA DO PESCADOR (Verde-amarelada refletindo na água)
        const chocaLanX = 72895, chocaLanY = 620;
        gLights.beginFill(0x70aa20, 0.22);
        gLights.drawCircle(chocaLanX, chocaLanY, 120);
        gLights.endFill();
        gLights.beginFill(0xc0ee50, 0.55);
        gLights.drawCircle(chocaLanX, chocaLanY, 38);
        gLights.endFill();

        // 4. LANTERNA PESSOAL DO JOGADOR (Move-se com o personagem!)
        const px = typeof global.meuX === 'number' ? global.meuX : PONTO_CHEGADA.x;
        const py = typeof global.meuY === 'number' ? global.meuY : PONTO_CHEGADA.y;

        if (isTesteVisual(px, py)) {
            const flickerPlayer = Math.sin(t * 15.0) * 3.0;
            const raioPlayer = 160 + flickerPlayer;

            gLights.beginFill(0xd4a373, 0.20);
            gLights.drawCircle(px, py, raioPlayer);
            gLights.endFill();

            gLights.beginFill(0xffeedd, 0.45);
            gLights.drawCircle(px, py, 55);
            gLights.endFill();

            luzesParaSombras.push({ x: px, y: py, raio: raioPlayer });
        }

        // 5. FOGOS-FÁTUOS / VAGALUMES (Orbes luminosos dançantes com luz própria)
        for (let i = 0; i < FOGOS_FATUOS.length; i++) {
            const f = FOGOS_FATUOS[i];
            const fx = f.x + Math.sin(t * f.vx * 3.0 + f.seed) * f.raioOrb;
            const fy = f.y + Math.cos(t * f.vy * 3.0 + f.seed) * (f.raioOrb * 0.7);
            const pulsar = 0.85 + Math.sin(t * 5.0 + f.seed * 2) * 0.25;

            gLights.beginFill(f.corHex, 0.45 * pulsar);
            gLights.drawCircle(fx, fy, 45 * pulsar);
            gLights.endFill();

            gLights.beginFill(0xffffff, 0.90 * pulsar);
            gLights.drawCircle(fx, fy, 5 * pulsar);
            gLights.endFill();
        }

        // 6. PORTAL RÚNICO ANCESTRAL (Pulso Místico Ciano e Violeta)
        if (!PORTAL_RETORNO) return;
        const portalPulsar = 0.85 + Math.sin(t * 3.5) * 0.18;
        gLights.beginFill(0x8338ec, 0.28 * portalPulsar);
        gLights.drawCircle(PORTAL_RETORNO.x, PORTAL_RETORNO.y, 160 * portalPulsar);
        gLights.endFill();

        gLights.beginFill(0x00f0ff, 0.55 * portalPulsar);
        gLights.drawCircle(PORTAL_RETORNO.x, PORTAL_RETORNO.y, 65 * portalPulsar);
        gLights.endFill();

        // Renderizar Sombras Projetadas usando as luzes ativas calculadas
        renderizarSombrasDinamicas(luzesParaSombras);
    }

    // ========================================================================
    // RENDERIZAÇÃO DO CENÁRIO DO PÂNTANO
    // ========================================================================
    let ultimoTempo = 0;

    function desenharCenarioTesteVisual(tempoAnimacao) {
        const t = (tempoAnimacao || 0);
        const dt = ultimoTempo > 0 ? Math.min(0.1, t - ultimoTempo) : 0.016;
        ultimoTempo = t;

        // Se PixiJS WebGL estiver disponível, usar o motor acelerado por hardware
        if (typeof window !== 'undefined' && typeof window.PIXI !== 'undefined') {
            if (!pixiIniciado) inicializarPixi();

            const pixiCanvas = document.getElementById('canvas-pixi-visual');
            if (pixiCanvas && pixiCanvas.style.display !== 'block') {
                pixiCanvas.style.display = 'block';
            }
            if (global.canvas && global.canvas.style.background !== 'transparent') {
                global.canvas.style.background = 'transparent';
            }

            if (pixiApp && worldContainer) {
                // Sincronizar resolução em caso de redimensionamento de janela
                if (pixiApp.renderer.width !== window.innerWidth || pixiApp.renderer.height !== window.innerHeight) {
                    pixiApp.renderer.resize(window.innerWidth, window.innerHeight);
                }

                // Sincronização 1:1 com a câmera do MMORPG
                const zoom = (typeof global.cameraZoomAtual === 'number' ? global.cameraZoomAtual : (global.ZOOM_CAMERA || 0.92));
                const camX = global.camX || 0;
                const camY = global.camY || 0;
                const sx = (typeof global.shakeX === 'number' ? global.shakeX : 0);
                const sy = (typeof global.shakeY === 'number' ? global.shakeY : 0);

                worldContainer.scale.set(zoom);
                worldContainer.position.set((-camX + sx) * zoom, (-camY + sy) * zoom);

                // Atualizar uniform de tempo do Shader GLSL de Água
                if (waterFilter && waterFilter.uniforms) {
                    waterFilter.uniforms.uTime = t * 1.0;
                }

                // Atualizar e projetar Iluminação e Sombras Dinâmicas em Tempo Real
                renderizarIluminacaoDinamica(t, dt);

                // Atualizar Névoa Volumétrica Derivante
                renderizarNevoaVolumetrica(t);

                // Renderizar frame WebGL
                pixiApp.render();
                return;
            }
        }

        // ====================================================================
        // FALLBACK ROBUSTO: Se o dispositivo não suportar WebGL ou Pixi falhar
        // ====================================================================
        desenharCenarioFallback2D(global.ctx, t);
    }

    function desenharCenarioFallback2D(ctx, t) {
        if (!ctx) return;
        if (!grid) gerarGrid();

        for (let l = 0; l < ROWS; l++) {
            for (let c = 0; c < COLS; c++) {
                const x = TESTE_X0 + c * TILE;
                const y = l * TILE;
                const cel = grid[l][c];
                ctx.fillStyle = cel.tipo === 'agua_funda' ? '#101d14' : (cel.tipo === 'passarela' ? '#3d2b1b' : '#142012');
                ctx.fillRect(x, y, TILE, TILE);
            }
        }
    }

    // ========================================================================
    // DESENHO DETALHADO DA FOGUEIRA RITUALÍSTICA DA BRUXA (Z-Sorted)
    // ========================================================================
    function desenharFogueiraRitual(ctx, f, t) {
        if (!ctx) return;
        ctx.save();
        const x = f.x;
        const y = f.y;

        // 1. Círculo de pedras enegrecidas pelo fogo
        const numPedras = 10;
        for (let i = 0; i < numPedras; i++) {
            const angP = (i / numPedras) * Math.PI * 2;
            const px = x + Math.cos(angP) * 22;
            const py = y + Math.sin(angP) * 14;

            ctx.fillStyle = '#1c1b18';
            ctx.beginPath();
            ctx.ellipse(px, py, 6, 4.5, angP, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#2d2b27';
            ctx.beginPath();
            ctx.ellipse(px - 1, py - 1, 3.5, 2.5, angP, 0, Math.PI * 2);
            ctx.fill();
        }

        // 2. Cinzas e carvão em brasa no centro
        ctx.fillStyle = '#0f0a06';
        ctx.beginPath();
        ctx.ellipse(x, y, 16, 10, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#b32600';
        ctx.beginPath();
        ctx.ellipse(x, y, 10, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // 3. Troncos cruzados em cone
        ctx.strokeStyle = '#2b1b10';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(x - 14, y + 5);
        ctx.lineTo(x + 14, y - 7);
        ctx.moveTo(x + 14, y + 5);
        ctx.lineTo(x - 14, y - 7);
        ctx.moveTo(x, y + 8);
        ctx.lineTo(x, y - 9);
        ctx.stroke();

        // 4. Chamas vivas dançantes animadas
        const f1 = Math.sin(t * 16.0) * 4;
        const f2 = Math.cos(t * 22.0) * 3;

        // Labareda externa laranja
        ctx.fillStyle = '#ff6200';
        ctx.beginPath();
        ctx.moveTo(x - 12, y + 2);
        ctx.quadraticCurveTo(x - 16 + f1, y - 18, x + f2, y - 36);
        ctx.quadraticCurveTo(x + 16 + f2, y - 18, x + 12, y + 2);
        ctx.closePath();
        ctx.fill();

        // Labareda interna amarelo-ouro
        ctx.fillStyle = '#ffdd00';
        ctx.beginPath();
        ctx.moveTo(x - 7, y);
        ctx.quadraticCurveTo(x - 8 + f2, y - 12, x + f1 * 0.5, y - 24);
        ctx.quadraticCurveTo(x + 8 + f1, y - 12, x + 7, y);
        ctx.closePath();
        ctx.fill();

        // Núcleo branco incandescente
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(x - 3, y);
        ctx.quadraticCurveTo(x, y - 8, x, y - 14);
        ctx.quadraticCurveTo(x + 3, y - 8, x + 3, y);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
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

            ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            ctx.fillRect(ex + 2, y + 5, 5, 24);

            ctx.fillStyle = '#241910';
            ctx.beginPath();
            ctx.moveTo(ex - 3, y - 5);
            ctx.lineTo(ex + 3, y - 5);
            ctx.lineTo(ex + 3 + inclinacao, y + 26);
            ctx.lineTo(ex - 3 + inclinacao, y + 26);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = '#2f5020';
            ctx.fillRect(ex - 4 + inclinacao, y + 16, 8, 10);
        }

        // 3. Piso e Decks da Varanda Semi-Desabada
        ctx.fillStyle = '#3a2717';
        ctx.fillRect(x - w * 0.48, y - 8, w * 0.96, 12);
        ctx.fillStyle = '#26190e';
        ctx.fillRect(x - w * 0.48, y + 4, w * 0.96, 4);

        // Barril de madeira quebrado na varanda
        ctx.fillStyle = '#362415';
        ctx.beginPath();
        ctx.ellipse(x + 50, y - 2, 9, 12, 0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#1d1209';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // 4. Paredes de Tábuas Desalinhadas e Carcomidas
        ctx.fillStyle = '#20150d';
        ctx.fillRect(x - w * 0.42, y - h * 0.75, w * 0.84, h * 0.72);

        const numTabuas = 10;
        for (let ti = 0; ti < numTabuas; ti++) {
            const ty = y - h * 0.72 + ti * 6.5;
            const seedT = hash2(ti, 99);
            const falha = (seedT > 0.82);

            if (!falha) {
                ctx.fillStyle = (ti % 2 === 0 ? '#43301e' : '#392818');
                const largT = w * 0.84 - (seedT > 0.6 ? 14 : 0);
                const offT = (seedT > 0.5 ? -3 : 2);
                ctx.fillRect(x - w * 0.42 + offT, ty, largT, 5.5);

                if (seedT > 0.5) {
                    ctx.fillStyle = '#345425';
                    ctx.fillRect(x - w * 0.42 + offT + 12, ty, 10, 2);
                }
            }
        }

        // Porta arrebentada pendurada por um único gonzo
        ctx.save();
        ctx.translate(x - 8, y - h * 0.48);
        ctx.rotate(0.18);
        ctx.fillStyle = '#4f3724';
        ctx.fillRect(-12, -18, 24, 36);
        ctx.strokeStyle = '#23160c';
        ctx.lineWidth = 2.0;
        ctx.strokeRect(-12, -18, 24, 36);
        ctx.restore();

        // Janela quebrada
        ctx.fillStyle = '#100b07';
        ctx.fillRect(x + 22, y - h * 0.55, 18, 16);
        ctx.strokeStyle = '#3a2717';
        ctx.lineWidth = 2.0;
        ctx.strokeRect(x + 22, y - h * 0.55, 18, 16);

        // 5. Telhado Parcialmente Desabado com Vigas Expostas
        ctx.fillStyle = '#312417';
        ctx.beginPath();
        ctx.moveTo(x - w * 0.52, y - h * 0.70);
        ctx.lineTo(x - 5, y - h * 1.15);
        ctx.lineTo(x + 10, y - h * 0.95);
        ctx.lineTo(x - w * 0.40, y - h * 0.65);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#483a24';
        ctx.beginPath();
        ctx.moveTo(x - w * 0.50, y - h * 0.72);
        ctx.lineTo(x - 5, y - h * 1.12);
        ctx.lineTo(x - 12, y - h * 1.08);
        ctx.lineTo(x - w * 0.46, y - h * 0.68);
        ctx.closePath();
        ctx.fill();

        // Vigas mestres expostas no lado desabado
        ctx.strokeStyle = '#291b10';
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.moveTo(x - 5, y - h * 1.15);
        ctx.lineTo(x + w * 0.48, y - h * 0.68);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x + 12, y - h * 1.02);
        ctx.lineTo(x + 24, y - h * 0.72);
        ctx.moveTo(x + 28, y - h * 0.88);
        ctx.lineTo(x + 42, y - h * 0.62);
        ctx.stroke();

        // Trepadeiras pendentes
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

        ctx.translate(x, y);
        ctx.rotate(0.08);

        ctx.fillStyle = 'rgba(10, 15, 8, 0.55)';
        ctx.beginPath();
        ctx.ellipse(0, 18, w * 0.55, 20, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#22160d';
        ctx.fillRect(-35, -5, 6, 26);
        ctx.fillRect(0, -5, 6, 26);
        ctx.fillRect(32, -5, 6, 26);

        ctx.fillStyle = '#2a481c';
        ctx.fillRect(-36, 12, 8, 14);
        ctx.fillRect(-1, 12, 8, 14);
        ctx.fillRect(31, 12, 8, 14);

        ctx.fillStyle = '#3a2717';
        ctx.fillRect(-w * 0.48, -10, w * 0.96, 10);

        ctx.fillStyle = '#1c1209';
        ctx.fillRect(-w * 0.42, -h * 0.75, w * 0.84, h * 0.65);

        ctx.fillStyle = '#422e1b';
        ctx.fillRect(-w * 0.42, -h * 0.75, w * 0.84, 8);
        ctx.fillRect(-w * 0.42, -h * 0.55, w * 0.84, 8);
        ctx.fillRect(-w * 0.42, -h * 0.35, w * 0.84, 8);

        // Telhado de palha podre furado
        ctx.fillStyle = '#312316';
        ctx.beginPath();
        ctx.moveTo(-w * 0.52, -h * 0.70);
        ctx.lineTo(0, -h * 1.10);
        ctx.lineTo(w * 0.52, -h * 0.65);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }

    // ========================================================================
    // DESENHO DOS CIPRESTES-CALVOS
    // ========================================================================
    function desenharCipresteRealista(ctx, arv, t) {
        if (!ctx) return;
        ctx.save();
        const x = arv.x;
        const y = arv.y;
        const h = arv.h;
        const troncoL = arv.troncoL;

        ctx.fillStyle = 'rgba(10, 16, 9, 0.60)';
        ctx.beginPath();
        ctx.ellipse(x + 8, y + 8, troncoL * 1.6, troncoL * 0.75, 0, 0, Math.PI * 2);
        ctx.fill();

        // Joelhos de cipreste
        const joelhos = [
            { dx: -troncoL * 1.3, dy: 4, h: 16 },
            { dx: troncoL * 1.25, dy: 6, h: 18 }
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
        }

        // Tronco canelado
        ctx.fillStyle = '#20160d';
        ctx.beginPath();
        ctx.moveTo(x - troncoL * 1.1, y + 6);
        ctx.quadraticCurveTo(x - troncoL * 0.5, y - h * 0.35, x - troncoL * 0.35, y - h * 0.85);
        ctx.lineTo(x + troncoL * 0.35, y - h * 0.85);
        ctx.quadraticCurveTo(x + troncoL * 0.5, y - h * 0.35, x + troncoL * 1.1, y + 6);
        ctx.closePath();
        ctx.fill();

        // Copa sombria
        ctx.fillStyle = '#162813';
        ctx.beginPath();
        ctx.ellipse(x, y - h, troncoL * 2.2, h * 0.38, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#223c1d';
        ctx.beginPath();
        ctx.ellipse(x - 8, y - h - 10, troncoL * 1.8, h * 0.30, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    // ========================================================================
    // DESENHO DOS SALGUEIROS-CHORÕES COM BARBA-DE-VELHO
    // ========================================================================
    function desenharSalgueiroRealista(ctx, arv, t) {
        if (!ctx) return;
        ctx.save();
        const x = arv.x;
        const y = arv.y;
        const h = arv.h;
        const troncoL = arv.troncoL;

        ctx.fillStyle = 'rgba(10, 16, 9, 0.55)';
        ctx.beginPath();
        ctx.ellipse(x + 5, y + 6, troncoL * 1.8, troncoL * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#23180f';
        ctx.beginPath();
        ctx.moveTo(x - troncoL * 0.7, y + 4);
        ctx.quadraticCurveTo(x - troncoL * 0.2, y - h * 0.4, x - troncoL * 0.4, y - h * 0.75);
        ctx.lineTo(x + troncoL * 0.3, y - h * 0.75);
        ctx.quadraticCurveTo(x + troncoL * 0.6, y - h * 0.4, x + troncoL * 0.7, y + 4);
        ctx.closePath();
        ctx.fill();

        // Barba-de-velho pendente
        const numMechas = 8;
        for (let mi = 0; mi < numMechas; mi++) {
            const mx = x - 35 + mi * 10;
            const altMecha = 35 + Math.sin(mi * 1.5) * 12;
            const balanco = Math.sin(t * 1.6 + mi * 0.6) * 3.0;

            ctx.strokeStyle = 'rgba(95, 125, 90, 0.70)';
            ctx.lineWidth = 2.0;
            ctx.beginPath();
            ctx.moveTo(mx, y - h * 0.70);
            ctx.quadraticCurveTo(mx + balanco * 0.7, y - h * 0.70 + altMecha * 0.5, mx + balanco, y - h * 0.70 + altMecha);
            ctx.stroke();
        }

        ctx.fillStyle = '#1e381b';
        ctx.beginPath();
        ctx.ellipse(x, y - h * 0.82, troncoL * 2.4, h * 0.30, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    // ========================================================================
    // DESENHO DOS TRONCOS MORTOS TOMBADOS
    // ========================================================================
    function desenharTroncoMortoRealista(ctx, tr, t) {
        if (!ctx) return;
        ctx.save();
        ctx.translate(tr.x, tr.y);
        ctx.rotate(tr.ang);

        ctx.fillStyle = 'rgba(10, 15, 8, 0.50)';
        ctx.beginPath();
        ctx.ellipse(0, tr.alt * 0.6, tr.comp * 0.55, tr.alt * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#26190f';
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(-tr.comp / 2, -tr.alt / 2, tr.comp, tr.alt, 6);
        else ctx.rect(-tr.comp / 2, -tr.alt / 2, tr.comp, tr.alt);
        ctx.fill();

        ctx.fillStyle = '#110b06';
        ctx.beginPath();
        ctx.ellipse(-tr.comp * 0.42, 0, 5, tr.alt * 0.38, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    // ========================================================================
    // DESENHO DE TABOAS E COGUMELOS
    // ========================================================================
    function desenharTaboasRealistas(ctx, tab, t) {
        if (!ctx) return;
        ctx.save();
        for (let i = 0; i < tab.count; i++) {
            const hTab = 28 + (i % 4) * 6;
            const dx = (i - tab.count / 2) * 5;
            const sway = Math.sin(t * 2.2 + i * 0.7 + tab.seed) * 3.0;

            ctx.strokeStyle = '#29481e';
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.moveTo(tab.x + dx, tab.y);
            ctx.quadraticCurveTo(tab.x + dx + sway * 0.5, tab.y - hTab * 0.5, tab.x + dx + sway, tab.y - hTab);
            ctx.stroke();

            ctx.strokeStyle = '#432613';
            ctx.lineWidth = 3.6;
            ctx.beginPath();
            ctx.moveTo(tab.x + dx + sway * 0.85, tab.y - hTab + 6);
            ctx.lineTo(tab.x + dx + sway, tab.y - hTab + 16);
            ctx.stroke();
        }
        ctx.restore();
    }

    function desenharCogumeloRealista(ctx, cog, t) {
        if (!ctx) return;
        ctx.save();
        const x = cog.x;
        const y = cog.y;
        const r = cog.r;

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

        ctx.fillStyle = '#e8dec8';
        ctx.fillRect(x - 1.5, y - r * 1.5, 3, r * 1.5);

        ctx.fillStyle = cog.cor;
        ctx.beginPath();
        ctx.arc(x, y - r * 1.5, r, Math.PI, Math.PI * 2);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }

    // ========================================================================
    // COLETA E ORDENAÇÃO DE SORTABLES (Z-SORTING 2.5D REAL COM O JOGADOR)
    // ========================================================================
    function coletarTestevisualSortables(tempoAnimacao, spritesSort) {
        if (!spritesSort) return;
        const t = (tempoAnimacao || 0);

        // 1. Fogueira Ritualística da Bruxa (Interativa no chão com Z-sort)
        spritesSort.push({
            tipo: 'fogueira_ritual',
            y: FOGUEIRA_RITUAL.y + 6,
            draw: function () {
                desenharFogueiraRitual(global.ctx, FOGUEIRA_RITUAL, t);
            }
        });

        // 2. Cabana Principal Arruinada
        spritesSort.push({
            tipo: 'cabana_principal_arruinada',
            y: CABANA_PRINCIPAL.y + 20,
            draw: function () {
                desenharCabanaPrincipalRealista(global.ctx, CABANA_PRINCIPAL, t);
            }
        });

        // 3. Choça Menor do Pescador Abandonada
        spritesSort.push({
            tipo: 'choca_pescador_arruinada',
            y: CHOCA_PESCADOR.y + 15,
            draw: function () {
                desenharChocaPescadorRealista(global.ctx, CHOCA_PESCADOR, t);
            }
        });

        // 4. Troncos Mortos e Ocos Caídos
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

        // 5. Árvores de Pântano (Ciprestes e Salgueiros)
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

        // 6. Tufos de Taboas / Juncos Altos
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

        // 7. Cogumelos Bioluminescentes
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
        FOGUEIRA_RITUAL: FOGUEIRA_RITUAL,
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
