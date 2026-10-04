// ============================================================================
// cartografia_universal.js — Sistema Universal de Cartografia & Radar
// Gera automaticamente o Minimapa em tempo real e o Mapa Mundial (Tecla [M])
// para TODOS os mapas atuais e quaisquer mapas futuros registrados.
// ============================================================================
(function (global) {
    'use strict';

    const _cacheMapas = new Map();
    const _cacheMinimapa = new Map();

    // Paletas temáticas universais para biomas de mapas
    const PALETAS_BIOMAS = {
        green: { solo: '#34633d', relevo: '#2d5434', agua: '#246b8f', caminho: '#755f3e', borda: '#1d3822' },
        desert: { solo: '#c9a86b', relevo: '#baa060', agua: '#2f8ca6', caminho: '#e2caa0', borda: '#8a6e38' },
        pantano: { solo: '#3a4a2c', relevo: '#2f3d24', agua: '#3a4729', caminho: '#595034', borda: '#202b17' },
        caverna: { solo: '#2b2326', relevo: '#1f191b', agua: '#183b4d', caminho: '#3d3438', borda: '#141012' },
        cidade: { solo: '#485863', relevo: '#3c4a54', agua: '#215c7a', caminho: '#8f887a', borda: '#252f36' },
        solari: { solo: '#342645', relevo: '#261b33', agua: '#5c2d91', caminho: '#694f85', borda: '#180f24' },
        cidadeperdida: { solo: '#364a38', relevo: '#2b3d2d', agua: '#1f4f54', caminho: '#736b57', borda: '#1c291d' },
        testevisual: { solo: '#344a2c', relevo: '#2a3d24', agua: '#2f6345', caminho: '#594d33', borda: '#1d2b18' },
        zonazero: { solo: '#caddeb', relevo: '#b5ccde', agua: '#3d7294', caminho: '#8ca6bd', borda: '#54728a' },
        castelo: { solo: '#3d3329', relevo: '#2e261e', agua: '#1f3847', caminho: '#57483b', borda: '#1c1611' },
        bemvindo: { solo: '#3b6e49', relevo: '#2f593b', agua: '#267b9e', caminho: '#8c7854', borda: '#1c3d26' },
        ruinas_01: { solo: '#524332', relevo: '#423628', agua: '#2a5b6e', caminho: '#7a6850', borda: '#2b2219' },
        floresta: { solo: '#274f33', relevo: '#1f3f29', agua: '#1d5a73', caminho: '#5e4b32', borda: '#132b1b' },
        nebulos: { solo: '#3a592b', relevo: '#2f4722', agua: '#235e61', caminho: '#6b5c3d', borda: '#1e3015' },
        abissal: { solo: '#231d33', relevo: '#1a1526', agua: '#451d69', caminho: '#3b3252', borda: '#100d17' },
        pantano_sombrio: { solo: '#243b27', relevo: '#1c2e1f', agua: '#263b22', caminho: '#453c2a', borda: '#121f14' },
        tileteste: { solo: '#447d3d', relevo: '#376631', agua: '#28759e', caminho: '#786445', borda: '#21421c' },
        mundo: { solo: '#3d6e3f', relevo: '#305932', agua: '#1b5275', caminho: '#7d6948', borda: '#040d1a' }
    };

    function hashCoord(x, y) {
        let h = Math.imul(x ^ 0x9E3779B1, y ^ 0xC2B2AE3D);
        h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
        return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
    }

    // Gera o preview cartográfico completo de qualquer mapa registrado
    function gerarCanvasMapaUniversal(mapaId) {
        if (typeof document === 'undefined') return null;
        if (_cacheMapas.has(mapaId)) return _cacheMapas.get(mapaId);

        // Se for o Continente de Gaia, usa o canvas nativo de alta definição
        if (mapaId === 'mundo' && global.mapaMundo && typeof global.mapaMundo.obterBigMapCanvas === 'function') {
            return global.mapaMundo.obterBigMapCanvas();
        }

        const reg = (global.MAPAS_REGISTRY || {})[mapaId];
        if (!reg) return null;

        const maxDim = 512;
        const aspect = reg.w / reg.h;
        let bw = maxDim, bh = Math.round(maxDim / aspect);
        if (bh > maxDim) { bh = maxDim; bw = Math.round(maxDim * aspect); }
        bw = Math.max(128, bw); bh = Math.max(128, bh);

        const canvas = document.createElement('canvas');
        canvas.width = bw;
        canvas.height = bh;
        const ctx = canvas.getContext('2d');
        const pal = PALETAS_BIOMAS[mapaId] || PALETAS_BIOMAS.green;

        // Fundo base do solo
        ctx.fillStyle = pal.solo;
        ctx.fillRect(0, 0, bw, bh);

        // Relevo procedural de bioma e nuances do terreno
        const img = ctx.createImageData(bw, bh);
        const data = new Uint32Array(img.data.buffer);
        const corSolo = hexParaRgb(pal.solo);
        const corRelevo = hexParaRgb(pal.relevo);
        const corCaminho = hexParaRgb(pal.caminho);

        for (let py = 0; py < bh; py++) {
            const ny = py / bh;
            const rowOff = py * bw;
            for (let px = 0; px < bw; px++) {
                const nx = px / bw;
                const h1 = hashCoord(px >> 2, py >> 2);
                const h2 = Math.sin(nx * 14 + Math.sin(ny * 12) * 1.5);
                let r = corSolo[0], g = corSolo[1], b = corSolo[2];

                if (h2 > 0.82) {
                    // Trilha/caminho natural do bioma
                    r = corCaminho[0]; g = corCaminho[1]; b = corCaminho[2];
                } else if (h1 > 0.62) {
                    r = corRelevo[0]; g = corRelevo[1]; b = corRelevo[2];
                } else if (h1 < 0.18) {
                    r = Math.floor(r * 0.9); g = Math.floor(g * 0.9); b = Math.floor(b * 0.9);
                }
                data[rowOff + px] = (255 << 24) | (b << 16) | (g << 8) | r;
            }
        }
        ctx.putImageData(img, 0, 0);

        // Desenho artístico de vinheta e borda de mapa náutico
        ctx.save();
        const vinheta = ctx.createRadialGradient(bw / 2, bh / 2, Math.min(bw, bh) * 0.35, bw / 2, bh / 2, Math.max(bw, bh) * 0.7);
        vinheta.addColorStop(0, 'rgba(0,0,0,0)');
        vinheta.addColorStop(1, 'rgba(10,14,20,0.55)');
        ctx.fillStyle = vinheta;
        ctx.fillRect(0, 0, bw, bh);

        // Grade náutica clássica sutil
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 1;
        for (let i = 1; i < 6; i++) {
            ctx.beginPath(); ctx.moveTo(bw * i / 6, 0); ctx.lineTo(bw * i / 6, bh); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, bh * i / 6); ctx.lineTo(bw, bh * i / 6); ctx.stroke();
        }

        // Borda dourada antiga
        ctx.strokeStyle = 'rgba(212, 175, 55, 0.45)';
        ctx.lineWidth = 2;
        ctx.strokeRect(1, 1, bw - 2, bh - 2);
        ctx.restore();

        _cacheMapas.set(mapaId, canvas);
        return canvas;
    }

    function hexParaRgb(hex) {
        if (!hex || hex[0] !== '#') return [50, 100, 50];
        const val = parseInt(hex.slice(1), 16);
        return [(val >> 16) & 255, (val >> 8) & 255, val & 255];
    }

    // ========================================================================
    // RENDERIZADOR UNIVERSAL DO MAPA MUNDIAL (Tecla [M])
    // ========================================================================
    function desenharBigMapUniversal(bigMapCtx, bigMapCanvas, currentMap, meuX, meuY) {
        if (!bigMapCtx || !bigMapCanvas) return;
        const reg = (global.MAPAS_REGISTRY || {})[currentMap];
        if (!reg) return;

        const bw = bigMapCanvas.width = bigMapCanvas.clientWidth || 800;
        const bh = bigMapCanvas.height = bigMapCanvas.clientHeight || 380;
        const padX = 8, padTop = 8, padBottom = 26;

        const escala = Math.min((bw - padX * 2) / reg.w, (bh - padTop - padBottom) / reg.h);
        const mapaW = reg.w * escala;
        const mapaH = reg.h * escala;
        const ox = (bw - mapaW) / 2;
        const oy = padTop + (bh - padTop - padBottom - mapaH) / 2;

        // Fundo oceânico contínuo no tom exato azul escuro do minimapa (elimina qualquer borda verde)
        const cx = ox + mapaW * 0.5;
        const cy = oy + mapaH * 0.5;
        const maxR = Math.max(bw, bh);
        const gradOceano = bigMapCtx.createRadialGradient(cx, cy, mapaW * 0.42, cx, cy, maxR * 0.85);
        gradOceano.addColorStop(0, '#092138');
        gradOceano.addColorStop(0.35, '#061626');
        gradOceano.addColorStop(1, '#030a14');
        bigMapCtx.fillStyle = gradOceano;
        bigMapCtx.fillRect(0, 0, bw, bh);

        // Obter e desenhar o mapa real renderizado
        const canvasMapa = gerarCanvasMapaUniversal(currentMap);
        if (canvasMapa) {
            bigMapCtx.drawImage(canvasMapa, ox, oy, mapaW, mapaH);
        } else {
            const pal = PALETAS_BIOMAS[currentMap] || PALETAS_BIOMAS.green;
            bigMapCtx.fillStyle = pal.solo;
            bigMapCtx.fillRect(ox, oy, mapaW, mapaH);
        }

        // Conversor de coordenadas de mundo para tela do mapa
        const toMap = function (x, y) {
            return { x: ox + (x - reg.x0) * escala, y: oy + (y - (reg.y0 || 0)) * escala };
        };
        const inMap = function (x, y) {
            return x >= reg.x0 && x < reg.x0 + reg.w && y >= (reg.y0 || 0) && y < (reg.y0 || 0) + reg.h;
        };

        // Drops de itens
        (global.listaDrops || []).forEach(function (drop) {
            if (!drop || !drop.item || !inMap(drop.x, drop.y)) return;
            const p = toMap(drop.x, drop.y);
            bigMapCtx.fillStyle = '#ffd166';
            bigMapCtx.fillRect(p.x - 2, p.y - 2, 4, 4);
        });

        // Monstros e Bosses removidos do mapa a pedido do usuário


        // Outros jogadores
        if (global.todosJogadores) {
            Object.keys(global.todosJogadores).forEach(function (id) {
                const jog = global.todosJogadores[id];
                if (!jog || jog.hp <= 0 || id === global.meuId || !inMap(jog.x + 12, jog.y + 16)) return;
                const p = toMap(jog.x + 12, jog.y + 16);
                bigMapCtx.fillStyle = '#6eb5ff';
                bigMapCtx.beginPath(); bigMapCtx.arc(p.x, p.y, 3.5, 0, Math.PI * 2); bigMapCtx.fill();
            });
        }

        // Jogador local (anel ciano pulsante com direção de visão)
        if (typeof meuX === 'number' && typeof meuY === 'number' && inMap(meuX + 12, meuY + 16)) {
            const p = toMap(meuX + 12, meuY + 16);
            bigMapCtx.save();
            const pulse = 8 + Math.sin(Date.now() / 180) * 2.5;
            bigMapCtx.strokeStyle = 'rgba(0, 255, 255, 0.85)';
            bigMapCtx.lineWidth = 2;
            bigMapCtx.beginPath(); bigMapCtx.arc(p.x, p.y, pulse, 0, Math.PI * 2); bigMapCtx.stroke();

            // Direção de olhar do jogador
            const ang = global.meuAngulo || 0;
            bigMapCtx.beginPath();
            bigMapCtx.moveTo(p.x, p.y);
            bigMapCtx.lineTo(p.x + Math.cos(ang) * 12, p.y + Math.sin(ang) * 12);
            bigMapCtx.strokeStyle = '#00ffff';
            bigMapCtx.lineWidth = 2.2;
            bigMapCtx.stroke();

            bigMapCtx.fillStyle = '#00ffff';
            bigMapCtx.beginPath(); bigMapCtx.arc(p.x, p.y, 4, 0, Math.PI * 2); bigMapCtx.fill();
            bigMapCtx.restore();
        }

        // Rodapé com coordenadas e nome do mapa/bioma em fonte nítida
        bigMapCtx.fillStyle = '#ffffff';
        bigMapCtx.font = 'bold 16px "Rajdhani", Arial, sans-serif';
        bigMapCtx.textAlign = 'left';
        let txtInfo = '📍 X: ' + Math.round(meuX || 0) + '   Y: ' + Math.round(meuY || 0);
        if (currentMap === 'mundo' && global.mapaMundo && typeof global.mapaMundo.biomaNome === 'function') {
            txtInfo += '   •   ' + global.mapaMundo.biomaNome(meuX || 0, meuY || 0);
        } else {
            txtInfo += '   •   ' + reg.nome;
        }
        bigMapCtx.strokeStyle = '#000000';
        bigMapCtx.lineWidth = 3.5;
        bigMapCtx.strokeText(txtInfo, 20, bh - 16);
        bigMapCtx.fillText(txtInfo, 20, bh - 16);
    }

    // ========================================================================
    // RENDERIZADOR UNIVERSAL DO MINIMAPA EM TEMPO REAL (HUD Superior)
    // ========================================================================
    let _lastX = -999999, _lastY = -999999, _lastEscala = -1, _lastTime = 0;
    let _mmBufferCanvas = null;

    function desenharMinimapaUniversal(mmCtx, mw, mh, meuX, meuY, escala, currentMap, cx0, cy0) {
        if (!mmCtx || typeof document === 'undefined') return;

        // Se for o Continente de Gaia e ele tiver o renderizador com dither e árvores nativas
        if (currentMap === 'mundo' && global.mapaMundo && typeof global.mapaMundo.desenharMinimapaMundo === 'function') {
            global.mapaMundo.desenharMinimapaMundo(mmCtx, mw, mh, meuX, meuY, escala, cx0, cy0);
            return;
        }

        const reg = (global.MAPAS_REGISTRY || {})[currentMap];
        const canvasMapa = gerarCanvasMapaUniversal(currentMap);

        if (!canvasMapa || !reg) {
            const pal = PALETAS_BIOMAS[currentMap] || PALETAS_BIOMAS.green;
            mmCtx.fillStyle = pal.solo;
            mmCtx.fillRect(0, 0, mw, mh);
            return;
        }

        // Recorte do mapa real centrado no jogador
        const invEscala = 1 / escala;
        const raioW = (mw / 2) * invEscala;
        const raioH = (mh / 2) * invEscala;

        // Coordenadas normalizadas dentro do mapa
        const cropX0 = ((meuX - reg.x0 - raioW) / reg.w) * canvasMapa.width;
        const cropY0 = ((meuY - (reg.y0 || 0) - raioH) / reg.h) * canvasMapa.height;
        const cropW = ((raioW * 2) / reg.w) * canvasMapa.width;
        const cropH = ((raioH * 2) / reg.h) * canvasMapa.height;

        mmCtx.save();
        // Fundo do bioma em caso de borda externa do mapa
        const pal = PALETAS_BIOMAS[currentMap] || PALETAS_BIOMAS.green;
        mmCtx.fillStyle = pal.borda || '#0c1610';
        mmCtx.fillRect(0, 0, mw, mh);

        // Desenha o recorte da textura do mapa real
        try {
            mmCtx.imageSmoothingEnabled = false;
            mmCtx.drawImage(canvasMapa, cropX0, cropY0, cropW, cropH, 0, 0, mw, mh);
        } catch (e) {
            mmCtx.fillStyle = pal.solo;
            mmCtx.fillRect(0, 0, mw, mh);
        }
        mmCtx.restore();
    }

    // Exportação do Módulo Universal
    const api = {
        gerarCanvasMapaUniversal: gerarCanvasMapaUniversal,
        desenharBigMapUniversal: desenharBigMapUniversal,
        desenharMinimapaUniversal: desenharMinimapaUniversal,
        PALETAS_BIOMAS: PALETAS_BIOMAS
    };

    global.CartografiaUniversal = api;
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
