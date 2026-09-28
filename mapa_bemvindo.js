// Ilha BemVindo — mapa inicial do jogador
// Faixa reservada: X 85000..87399 | Y 0..1799
// Dimensões: 2400 x 1800
//
// IMPORTANTE:
// - Nenhuma colisão fixa neste arquivo.
// - Colisões ficam exclusivamente no Editor Admin.
// - Camadas de foreground/depth também ficam no Editor Admin.
// - O chão usa somente as texturas novas sand.png e grass.png.

(function (global) {
    'use strict';

    const BEMVINDO_X0 = 85000;
    const BEMVINDO_X1 = 87400;
    const BEMVINDO_Y0 = 0;
    const BEMVINDO_Y1 = 1800;
    const LARGURA = 2400;
    const ALTURA = 1800;

    const PONTO_SPAWN = { x: 85720, y: 930 };

    const SPRITE_FILES = {
        sand: 'sprites/bemvindo/sand.png',
        grass: 'sprites/bemvindo/grass.png',
        palm: 'sprites/bemvindo/palm.svg',
        treeA: 'sprites/bemvindo/tree_a.png',
        treeB: 'sprites/bemvindo/tree_b.png',
        rock: 'sprites/bemvindo/rock_cluster.svg',
        cabana: 'sprites/bemvindo/cabana.svg',
        tentA: 'sprites/bemvindo/tent_a.png',
        tentB: 'sprites/bemvindo/tent_b.png',
        shipwreck: 'sprites/bemvindo/shipwreck.svg',
        crates: 'sprites/bemvindo/crate_pile.svg',
        barrel: 'sprites/bemvindo/barrel.svg',
        logs: 'sprites/bemvindo/logs.png',
        campfireSheet: 'sprites/bemvindo/campfire_sheet.svg',
        bed: 'sprites/bemvindo/bed.svg'
    };

    const SPRITES = {};
    let assetsLoaded = 0;
    let assetsTotal = 0;
    let terrainCache = null;
    let terrainDirty = true;

    function carregarSprites() {
        if (typeof Image === 'undefined') return;

        const entries = Object.entries(SPRITE_FILES);
        assetsTotal = entries.length;

        for (const [nome, src] of entries) {
            const img = new Image();
            img.onload = function () {
                assetsLoaded++;
                terrainDirty = true;
            };
            img.onerror = function () {
                assetsLoaded++;
                terrainDirty = true;
            };
            img.src = src;
            SPRITES[nome] = img;
        }
    }

    carregarSprites();

    function isBemVindo(x, y) {
        return x >= BEMVINDO_X0 && x < BEMVINDO_X1 &&
            y >= BEMVINDO_Y0 && y < BEMVINDO_Y1;
    }

    function drawSprite(ctx, img, x, y, w, h, alpha) {
        if (!ctx || !img || !img.complete || !img.naturalWidth) return;

        ctx.save();
        ctx.imageSmoothingEnabled = false;
        if (alpha !== undefined) ctx.globalAlpha = alpha;
        ctx.drawImage(img, Math.round(x), Math.round(y), Math.round(w), Math.round(h));
        ctx.restore();
    }

    function drawSpriteFrame(ctx, img, frame, frameW, frameH, x, y, w, h) {
        if (!ctx || !img || !img.complete || !img.naturalWidth) return;

        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(
            img,
            Math.floor(frame) * frameW, 0, frameW, frameH,
            Math.round(x), Math.round(y), Math.round(w), Math.round(h)
        );
        ctx.restore();
    }

    function ilhaPath(ctx, inset) {
        const i = inset || 0;

        ctx.beginPath();
        ctx.moveTo(210 + i, 930);
        ctx.bezierCurveTo(235 + i, 570, 500 + i, 285 + i, 910, 215 + i);
        ctx.bezierCurveTo(1260, 150 + i, 1710, 215 + i, 2025 - i, 430);
        ctx.bezierCurveTo(2260 - i, 595, 2285 - i, 890, 2160 - i, 1160);
        ctx.bezierCurveTo(2030 - i, 1440, 1700, 1600 - i, 1310, 1625 - i);
        ctx.bezierCurveTo(920, 1650 - i, 520, 1515 - i, 315 + i, 1270);
        ctx.bezierCurveTo(225 + i, 1160, 195 + i, 1035, 210 + i, 930);
        ctx.closePath();
    }

    function tile(ctx, img, x, y, w, h) {
        if (!img || !img.complete || !img.naturalWidth) return;

        const tw = img.naturalWidth;
        const th = img.naturalHeight;

        for (let yy = y; yy < y + h; yy += th) {
            for (let xx = x; xx < x + w; xx += tw) {
                const dw = Math.min(tw, x + w - xx);
                const dh = Math.min(th, y + h - yy);
                ctx.drawImage(img, xx, yy, dw, dh);
            }
        }
    }

    function criarTerrainCache() {
        if (typeof document === 'undefined') return null;

        const canvas = document.createElement('canvas');
        canvas.width = LARGURA;
        canvas.height = ALTURA;

        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        ctx.clearRect(0, 0, LARGURA, ALTURA);
        ctx.imageSmoothingEnabled = false;

        // Oceano base.
        const oceano = ctx.createLinearGradient(0, 0, LARGURA, ALTURA);
        oceano.addColorStop(0, '#07516c');
        oceano.addColorStop(0.5, '#087c91');
        oceano.addColorStop(1, '#064762');
        ctx.fillStyle = oceano;
        ctx.fillRect(0, 0, LARGURA, ALTURA);

        // Ondas discretas.
        ctx.save();
        ctx.globalAlpha = 0.12;
        ctx.strokeStyle = '#b7f3f2';
        ctx.lineWidth = 2;

        for (let y = 55; y < ALTURA; y += 72) {
            for (let x = 20; x < LARGURA; x += 145) {
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.quadraticCurveTo(x + 34, y - 7, x + 68, y);
                ctx.stroke();
            }
        }
        ctx.restore();

        // Sombra externa da ilha.
        ctx.save();
        ctx.translate(0, 22);
        ilhaPath(ctx, -8);
        ctx.fillStyle = 'rgba(2, 24, 28, 0.45)';
        ctx.fill();
        ctx.restore();

        // Praia: somente sand.png.
        ctx.save();
        ilhaPath(ctx, 0);
        ctx.clip();
        ctx.fillStyle = '#d4b46c';
        ctx.fill();
        tile(ctx, SPRITES.sand, 0, 0, LARGURA, ALTURA);
        ctx.restore();

        // Interior: somente grass.png.
        ctx.save();
        ilhaPath(ctx, 115);
        ctx.clip();
        ctx.fillStyle = '#477d38';
        ctx.fill();
        tile(ctx, SPRITES.grass, 80, 80, LARGURA - 160, ALTURA - 160);
        ctx.restore();

        // Pequenas áreas de areia continuam usando a mesma sand.png.
        ctx.save();
        ctx.clip();

        const clareiras = [
            [1080, 860, 210, 105],
            [1410, 900, 175, 90],
            [1660, 1080, 150, 78],
            [790, 1120, 145, 70]
        ];

        for (const [x, y, rx, ry] of clareiras) {
            ctx.save();
            ctx.beginPath();
            ctx.ellipse(x, y, rx, ry, -0.08, 0, Math.PI * 2);
            ctx.clip();
            tile(ctx, SPRITES.sand, x - rx, y - ry, rx * 2, ry * 2);
            ctx.restore();
        }

        ctx.restore();

        return canvas;
    }

    function desenharOceanoAnimado(ctx, camX, camY, cw, ch, t) {
        const x0 = Math.max(BEMVINDO_X0 - 100, camX - 100);
        const y0 = Math.max(0, camY - 100);
        const x1 = Math.min(BEMVINDO_X1 + 100, camX + cw + 100);
        const y1 = Math.min(ALTURA, camY + ch + 100);

        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineWidth = 2;

        for (let faixa = 0; faixa < 25; faixa++) {
            const y = Math.floor(y0 / 75 + faixa) * 75;
            ctx.globalAlpha = 0.08 + (faixa % 3) * 0.025;
            ctx.strokeStyle = faixa % 2 ? '#b7f3f2' : '#5bd0d7';

            ctx.beginPath();

            for (let x = x0 - 60; x <= x1 + 60; x += 36) {
                const yy = y + Math.sin(x * 0.009 + t * 1.2 + faixa) * 4;

                if (x === x0 - 60) ctx.moveTo(x, yy);
                else ctx.lineTo(x, yy);
            }

            ctx.stroke();
        }

        ctx.restore();
    }

    function desenharEspuma(ctx, t) {
        ctx.save();
        ctx.translate(BEMVINDO_X0, 0);

        ctx.lineCap = 'round';
        ctx.lineWidth = 4;
        ctx.setLineDash([8, 14]);
        ctx.lineDashOffset = -t * 22;
        ctx.strokeStyle = 'rgba(235,255,250,0.72)';

        ilhaPath(ctx, 3);
        ctx.stroke();

        ctx.setLineDash([]);
        ctx.restore();
    }

    const FIRES = [
        { x: 1260, y: 875, scale: 1 },
        { x: 1510, y: 900, scale: 0.72 }
    ];

    function desenharFogueira(ctx, x, y, scale, t) {
        const frame = Math.floor(t * 10) % 8;

        const glow = ctx.createRadialGradient(
            x, y - 28 * scale, 4,
            x, y - 28 * scale, 105 * scale
        );

        glow.addColorStop(0, 'rgba(255,214,100,0.28)');
        glow.addColorStop(0.4, 'rgba(255,130,35,0.13)');
        glow.addColorStop(1, 'rgba(255,80,10,0)');

        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y - 20 * scale, 105 * scale, 0, Math.PI * 2);
        ctx.fill();

        drawSpriteFrame(
            ctx,
            SPRITES.campfireSheet,
            frame,
            96,
            96,
            x - 55 * scale,
            y - 78 * scale,
            110 * scale,
            110 * scale
        );
    }

    // Cenário alto entra no mesmo Y-SORT dos jogadores.
    // Não cria colisão: somente profundidade visual.
    function coletarBemVindoSortables(t, arr) {
        if (!Array.isArray(arr)) return arr;

        const ctx = global.ctx;
        if (!ctx) return arr;

        const add = (y, draw) => arr.push({ y, draw });

        // NPC Guia do Tutorial — visual simples e legível, sem colisão.
        const tut = global.tutorialState;
        // O Guia é um NPC permanente do mapa. O tutorial apenas usa a mesma entidade.
        if (global.currentMap === 'bemvindo') {
            const nx = tut && tut.npc ? tut.npc.x : BEMVINDO_X0 + 820;
            const ny = tut && tut.npc ? tut.npc.y : 930;
            add(ny + 32, () => {
                // NPC Guia usa a mesma linguagem visual das classes: sombra, pernas,
                // botas, torso em camadas, braços, cabeça, cabelo e detalhes de equipamento.
                const tNow = Date.now() / 1000;
                const walk = Math.sin(tNow * 2.4) * 0.8;
                const pulse = 0.82 + Math.sin(tNow * 3.2) * 0.12;
                ctx.save();
                ctx.translate(nx, ny);
                ctx.scale(0.78, 0.78);
                ctx.globalAlpha = pulse;

                // sombra
                ctx.fillStyle = 'rgba(0,0,0,.38)';
                ctx.beginPath(); ctx.ellipse(0, 31, 21, 7, 0, 0, Math.PI * 2); ctx.fill();

                // capa curta atrás
                ctx.fillStyle = '#24364d';
                ctx.beginPath(); ctx.moveTo(-11, -1); ctx.lineTo(-19, 23); ctx.lineTo(-8, 28); ctx.lineTo(12, 25); ctx.lineTo(16, 0); ctx.closePath(); ctx.fill();
                ctx.strokeStyle = '#55708c'; ctx.lineWidth = 1.5; ctx.stroke();

                // pernas e botas
                ctx.strokeStyle = '#202832'; ctx.lineWidth = 6; ctx.lineCap = 'round';
                ctx.beginPath(); ctx.moveTo(-6, 16); ctx.lineTo(-8 + walk, 28); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(6, 16); ctx.lineTo(8 - walk, 28); ctx.stroke();
                ctx.fillStyle = '#171c23'; ctx.fillRect(-13 + walk, 25, 10, 6); ctx.fillRect(4 - walk, 25, 10, 6);

                // torso/peitoral em camadas
                ctx.fillStyle = '#314b63'; ctx.beginPath(); ctx.roundRect(-12, -3, 24, 23, 4); ctx.fill();
                ctx.fillStyle = '#47677f'; ctx.fillRect(-8, 0, 16, 14);
                ctx.fillStyle = '#c49a42'; ctx.fillRect(-11, 12, 22, 4); // cinto
                ctx.fillStyle = '#f0c85c'; ctx.fillRect(-2, 12, 5, 5); // fivela

                // braços com luvas
                ctx.strokeStyle = '#314b63'; ctx.lineWidth = 6;
                ctx.beginPath(); ctx.moveTo(-10, 1); ctx.lineTo(-17, 13); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(10, 1); ctx.lineTo(17, 13); ctx.stroke();
                ctx.fillStyle = '#b9875c'; ctx.beginPath(); ctx.arc(-17, 14, 4, 0, Math.PI * 2); ctx.arc(17, 14, 4, 0, Math.PI * 2); ctx.fill();

                // cabeça + pescoço
                ctx.fillStyle = '#c9966c'; ctx.fillRect(-5, -10, 10, 8);
                ctx.beginPath(); ctx.arc(0, -18, 11, 0, Math.PI * 2); ctx.fill();
                // cabelo/barba
                ctx.fillStyle = '#3a2925'; ctx.beginPath(); ctx.arc(0, -21, 11, Math.PI, Math.PI * 2); ctx.fill();
                ctx.fillRect(-10, -21, 4, 9); ctx.fillRect(6, -21, 4, 9);
                ctx.fillStyle = '#ead6b4'; ctx.fillRect(-7, -14, 14, 5);
                // olhos
                ctx.fillStyle = '#f4d06f'; ctx.fillRect(-5, -18, 3, 2); ctx.fillRect(3, -18, 3, 2);

                // lenço/insígnia de guia
                ctx.fillStyle = '#d6a83e'; ctx.fillRect(-3, -8, 6, 9);
                ctx.fillStyle = '#f4d06f'; ctx.beginPath(); ctx.arc(0, -4, 2, 0, Math.PI * 2); ctx.fill();

                // marcador de NPC
                ctx.shadowColor = '#f4d06f'; ctx.shadowBlur = 12;
                ctx.strokeStyle = '#f4d06f'; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.arc(0, 4, 28 + Math.sin(tNow * 4) * 2, 0, Math.PI * 2); ctx.stroke();
                ctx.shadowBlur = 0;
                ctx.fillStyle = '#fff3b0'; ctx.font = 'bold 11px Arial'; ctx.textAlign = 'center';
                ctx.fillText('GUIA', 0, -43);
                ctx.restore();
            });
        }

        // Naufrágio na praia oeste.
        add(1010, () => {
            drawSprite(ctx, SPRITES.shipwreck, BEMVINDO_X0 + 250, 790, 430, 300);
        });

        add(1100, () => {
            drawSprite(ctx, SPRITES.logs, BEMVINDO_X0 + 420, 1080, 125, 72, 0.9);
        });

        // Acampamento principal.
        add(770, () => {
            drawSprite(ctx, SPRITES.cabana, BEMVINDO_X0 + 1000, 585, 250, 200);
        });

        add(815, () => {
            drawSprite(ctx, SPRITES.bed, BEMVINDO_X0 + 1040, 650, 140, 92);
        });

        add(830, () => {
            drawSprite(ctx, SPRITES.cabana, BEMVINDO_X0 + 1370, 640, 230, 182);
        });

        add(870, () => {
            drawSprite(ctx, SPRITES.bed, BEMVINDO_X0 + 1410, 700, 135, 88);
        });

        // Tendas.
        add(1060, () => {
            drawSprite(ctx, SPRITES.tentA, BEMVINDO_X0 + 1650, 820, 190, 165);
        });

        add(1160, () => {
            drawSprite(ctx, SPRITES.tentB, BEMVINDO_X0 + 1770, 1060, 175, 150);
        });

        // Suprimentos próximos ao acampamento.
        add(1160, () => {
            drawSprite(ctx, SPRITES.crates, BEMVINDO_X0 + 760, 1050, 165, 125);
        });

        add(1180, () => {
            drawSprite(ctx, SPRITES.barrel, BEMVINDO_X0 + 875, 1090, 80, 96);
        });

        add(1165, () => {
            drawSprite(ctx, SPRITES.logs, BEMVINDO_X0 + 940, 1090, 135, 82);
        });

        // Palmeiras.
        const palmeiras = [
            [430, 480, 155, 155],
            [620, 360, 165, 165],
            [820, 260, 150, 150],
            [1840, 410, 165, 165],
            [2030, 650, 150, 150],
            [2050, 1270, 155, 155],
            [1580, 1450, 165, 165],
            [650, 1410, 150, 150]
        ];

        for (const [x, y, w, h] of palmeiras) {
            const wx = BEMVINDO_X0 + x;
            const baseY = y + 38;

            add(baseY, () => {
                drawSprite(ctx, SPRITES.palm, wx - w / 2, y - h + 35, w, h);
            });
        }

        // Árvores.
        const arvores = [
            [930, 360, 145, 185],
            [1720, 420, 140, 180],
            [1840, 1330, 150, 190],
            [850, 1430, 135, 175],
            [1320, 1450, 145, 185]
        ];

        for (let i = 0; i < arvores.length; i++) {
            const [x, y, w, h] = arvores[i];
            const wx = BEMVINDO_X0 + x;

            add(y + 32, () => {
                drawSprite(
                    ctx,
                    i % 2 ? SPRITES.treeA : SPRITES.treeB,
                    wx - w / 2,
                    y - h + 32,
                    w,
                    h
                );
            });
        }

        // Pedras e vegetação baixa.
        const pedras = [
            [430, 760, 105, 82],
            [610, 560, 90, 72],
            [1980, 830, 105, 82],
            [1960, 1150, 115, 88],
            [1450, 1510, 105, 82]
        ];

        for (const [x, y, w, h] of pedras) {
            add(y + h / 2, () => {
                drawSprite(
                    ctx,
                    SPRITES.rock,
                    BEMVINDO_X0 + x - w / 2,
                    y - h / 2,
                    w,
                    h,
                    0.95
                );
            });
        }

        // Arbustos.
        const arbustos = [
            [700, 670, 125, 76],
            [920, 550, 120, 72],
            [1540, 590, 135, 82],
            [1790, 760, 130, 80],
            [760, 1240, 125, 78],
            [1120, 1270, 140, 84],
            [1500, 1220, 130, 78]
        ];

        for (let i = 0; i < arbustos.length; i++) {
            const [x, y, w, h] = arbustos[i];

            add(y + h / 2, () => {
                drawSprite(
                    ctx,
                    i % 2 ? SPRITES.bushB : SPRITES.bushA,
                    BEMVINDO_X0 + x - w / 2,
                    y - h / 2,
                    w,
                    h
                );
            });
        }

        // Camadas criadas pelo Editor Admin entram no mesmo Y-SORT do mapa.
        if (typeof global.coletarCamadasMapaAtivo === 'function') {
            global.coletarCamadasMapaAtivo(t, arr);
        }

        return arr;
    }

    function desenharCamadaMapaAtivo(ctx, camada) {
        if (global.currentMap !== 'bemvindo') return;
        if (!ctx || !camada || !terrainCache) return;

        const x = BEMVINDO_X0 + (camada.x || 0);
        const y = camada.y || 0;
        const w = Math.max(4, camada.w || 40);
        const h = Math.max(4, camada.h || 40);

        ctx.save();
        ctx.imageSmoothingEnabled = false;

        // Mesmo princípio do Editor da Cidade:
        // a camada reaproveita o chão e entra no Y-SORT pela baseY.
        if (camada.tipo === 'line' &&
            Array.isArray(camada.pontos) &&
            camada.pontos.length > 1) {

            ctx.beginPath();
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            ctx.moveTo(
                BEMVINDO_X0 + camada.pontos[0].x,
                camada.pontos[0].y
            );

            for (let i = 1; i < camada.pontos.length; i++) {
                ctx.lineTo(
                    BEMVINDO_X0 + camada.pontos[i].x,
                    camada.pontos[i].y
                );
            }

            ctx.lineWidth = Math.max(4, camada.espessura || 16);
            ctx.stroke();
            ctx.clip();
            ctx.drawImage(terrainCache, BEMVINDO_X0, 0);
        } else {
            // terrainCache usa coordenadas LOCAIS (0..2400 / 0..1800).
            // A camada, porém, é posicionada no mundo a partir de BEMVINDO_X0.
            ctx.drawImage(
                terrainCache,
                camada.x || 0, camada.y || 0, w, h,
                x, y, w, h
            );
        }

        ctx.restore();
    }

    function desenharCenarioBemVindo(t) {
        const ctx = global.ctx;
        if (!ctx) return;

        const camX = global.camX || BEMVINDO_X0;
        const camY = global.camY || 0;
        const zoom = global.cameraZoomAtual || global.ZOOM_CAMERA || 1;
        const canvasW = (global.canvas && global.canvas.width) || 900;
        const canvasH = (global.canvas && global.canvas.height) || 600;

        const cw = canvasW / zoom;
        const ch = canvasH / zoom;

        desenharOceanoAnimado(ctx, camX, camY, cw, ch, t);

        // O terreno nunca pode ficar vazio esperando o carregamento dos sprites.
        // Primeiro cria o cache com os fundos de fallback; quando sand/grass
        // terminarem de carregar, terrainDirty força uma nova versão com as texturas.
        if (terrainDirty) {
            terrainCache = criarTerrainCache();
            terrainDirty = assetsLoaded < assetsTotal;
        }

        if (terrainCache) {
            ctx.save();
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(terrainCache, BEMVINDO_X0, 0);
            ctx.restore();
        }

        desenharEspuma(ctx, t);

        // Iluminação simples do acampamento.
        const luzes = [
            [BEMVINDO_X0 + 1260, 875, 115],
            [BEMVINDO_X0 + 1510, 900, 90]
        ];

        for (const [x, y, raio] of luzes) {
            const g = ctx.createRadialGradient(x, y, 5, x, y, raio);
            g.addColorStop(0, 'rgba(255,220,120,0.12)');
            g.addColorStop(1, 'rgba(255,160,40,0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(x, y, raio, 0, Math.PI * 2);
            ctx.fill();
        }

        // Fogueiras ficam atrás/na frente do personagem conforme o Y-SORT.
        for (const fogo of FIRES) {
            const x = BEMVINDO_X0 + fogo.x;
            const y = fogo.y;
            desenharFogueira(ctx, x, y, fogo.scale, t);
        }
    }

    global.BEMVINDO_X0 = BEMVINDO_X0;
    global.BEMVINDO_X1 = BEMVINDO_X1;
    global.BEMVINDO_Y1 = BEMVINDO_Y1;
    global.PONTO_SPAWN_BEMVINDO = PONTO_SPAWN;

    global.isBemVindo = isBemVindo;
    global.desenharCenarioBemVindo = desenharCenarioBemVindo;
    global.coletarBemVindoSortables = coletarBemVindoSortables;
    // Registro por mapa: não sobrescreve o renderizador global usado pelos outros mapas.
    global.desenharCamadaMapaAtivoPorMapa = global.desenharCamadaMapaAtivoPorMapa || {};
    global.desenharCamadaMapaAtivoPorMapa.bemvindo = desenharCamadaMapaAtivo;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            BEMVINDO_X0,
            BEMVINDO_X1,
            BEMVINDO_Y1,
            PONTO_SPAWN,
            isBemVindo
        };
    }
})(typeof window !== 'undefined' ? window : globalThis);
