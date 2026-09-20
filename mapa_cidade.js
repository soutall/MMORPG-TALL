// ============================================================================
// mapa_cidade.js — FASE 5: Cidade de Davahl (Arte Nativa 1:1 sprites/cidade.png)
// Módulo isomórfico: Navegador (window) e Servidor (module.exports).
//
//   • Cidade: x em [59800, 61174) × y em [0, 1145) (escala nativa 1374 × 1145 px)
//   • Zero estiramento, máxima nitidez das texturas e construções
//   • Colisões dinâmicas: gerenciadas em tempo real via colisoes_cidade.json e Editor Admin
//   • Portais:
//       - Portal de Viagem (PORTAL_MAPAS): (60487, 460), praça norte
//       - Portal Ponte Sul (Retorno ao Verde): (60487, 1080)
//       - Chegada / Spawn: (60487, 660), praça sul em frente à estátua
// ============================================================================
(function (global) {
    'use strict';

    const TILE = 20;
    const CID_X0 = 59800;
    const LARGURA = 1374;
    const ALTURA = 1145;
    const CID_X1 = CID_X0 + LARGURA; // 61174
    const CID_Y1 = ALTURA;          // 1145
    const COLS = Math.ceil(LARGURA / TILE); // 69
    const ROWS = Math.ceil(ALTURA / TILE);  // 58

    const ALT_LIVRE = 0, ALT_PEQUENA = 1, ALT_MEDIA = 2, ALT_ALTA = 3;

    // Centros e Portais
    const PRACA_CENTRO = { x: CID_X0 + 687, y: 572 };
    const PONTO_SPAWN = { x: CID_X0 + 687, y: 660 };

    // Portal no Campo Verde que leva à Cidade
    const PORTA_CIDADE_VERDE = {
        x: 5000,
        y: 1200,
        r: 58,
        alvo: { x: PONTO_SPAWN.x, y: PONTO_SPAWN.y }
    };

    // Portal na ponte sul de Davahl que leva de volta ao Campo Verde
    const PORTA_CIDADE_RETORNO = {
        x: CID_X0 + 687,
        y: 1080,
        r: 60,
        alvo: { x: 5000, y: 1200 }
    };

    // Portal Interdimensional de Seleção de Mapas (clicável/tocável)
    const PORTAL_MAPAS = {
        x: 60474,
        y: 640,
        r: 45
    };

    // ============================================================================
    // OBSTÁCULOS GEOMÉTRICOS PADRÃO
    // ============================================================================
    const DEFAULT_OBSTACULOS = [
        { id: 'castelo_real', tipo: 'rect', x: 0, y: 0, w: 1374, h: 155, nome: 'Castelo Real (Muralha Norte)' },
        { id: 'rio_oeste', tipo: 'rect', x: 0, y: 0, w: 180, h: 1145, nome: 'Rio Oeste' },
        { id: 'lago_cachoeira', tipo: 'rect', x: 180, y: 100, w: 140, h: 150, nome: 'Lago da Cachoeira' },
        { id: 'margem_rio', tipo: 'rect', x: 0, y: 250, w: 210, h: 190, nome: 'Margem do Rio' },
        { id: 'muralha_leste', tipo: 'rect', x: 1220, y: 0, w: 154, h: 1145, nome: 'Muralha Leste' },
        { id: 'doca_barco', tipo: 'rect', x: 1090, y: 860, w: 284, h: 285, nome: 'Lago e Doca do Barco' },
        { id: 'fosso_sul_oeste', tipo: 'rect', x: 0, y: 960, w: 640, h: 185, nome: 'Fosso Sul (Oeste)' },
        { id: 'fosso_sul_leste', tipo: 'rect', x: 735, y: 960, w: 639, h: 185, nome: 'Fosso Sul (Leste)' },
        { id: 'estatua_anjo', tipo: 'circle', cx: 687, cy: 572, r: 40, nome: 'Estátua do Anjo (Praça)' },
        { id: 'alquimia', tipo: 'rect', x: 340, y: 200, w: 160, h: 140, nome: 'Laboratório de Alquimia' },
        { id: 'forja', tipo: 'rect', x: 915, y: 170, w: 245, h: 190, nome: 'Forja dos Dragões' },
        { id: 'mercador', tipo: 'rect', x: 180, y: 460, w: 155, h: 125, nome: 'Mercador Geral' },
        { id: 'pavilhao_arcano', tipo: 'circle', cx: 1110, cy: 520, r: 65, nome: 'Pavilhão Arcano' },
        { id: 'capela_luz', tipo: 'rect', x: 320, y: 740, w: 120, h: 100, nome: 'Capela da Luz' },
        { id: 'quartel_guarda', tipo: 'rect', x: 915, y: 740, w: 130, h: 110, nome: 'Quartel da Guarda' }
    ];

    function distPontoSegmento(px, py, x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const lenSq = dx * dx + dy * dy;
        if (lenSq === 0) return Math.hypot(px - x1, py - y1);
        let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
        t = Math.max(0, Math.min(1, t));
        return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
    }

    function normalizarObstaculos(lista) {
        if (!Array.isArray(lista)) return [];
        return lista.map(function (o, idx) {
            const id = o.id || ('col_' + (idx + 1) + '_' + Date.now().toString(36));
            const tipo = (o.tipo === 'circle') ? 'circle' : ((o.tipo === 'line' || o.tipo === 'polyline') ? 'line' : 'rect');
            const nome = o.nome || (tipo === 'circle' ? ('Círculo ' + (idx + 1)) : (tipo === 'line' ? ('Linha Curva ' + (idx + 1)) : ('Caixa ' + (idx + 1))));
            if (tipo === 'circle') {
                return {
                    id: id,
                    tipo: tipo,
                    nome: nome,
                    cx: typeof o.cx === 'number' ? Math.round(o.cx) : 687,
                    cy: typeof o.cy === 'number' ? Math.round(o.cy) : 572,
                    r: typeof o.r === 'number' ? Math.round(Math.max(5, o.r)) : 30
                };
            } else if (tipo === 'line') {
                const pontosRaw = Array.isArray(o.pontos) ? o.pontos : [];
                const pontos = pontosRaw.map(function (pt) {
                    return { x: Math.round(pt.x || 0), y: Math.round(pt.y || 0) };
                });
                let minX = pontos.length ? pontos[0].x : 0;
                let maxX = pontos.length ? pontos[0].x : 10;
                let minY = pontos.length ? pontos[0].y : 0;
                let maxY = pontos.length ? pontos[0].y : 10;
                for (let pi = 1; pi < pontos.length; pi++) {
                    if (pontos[pi].x < minX) minX = pontos[pi].x;
                    if (pontos[pi].x > maxX) maxX = pontos[pi].x;
                    if (pontos[pi].y < minY) minY = pontos[pi].y;
                    if (pontos[pi].y > maxY) maxY = pontos[pi].y;
                }
                const espessura = Math.max(4, Math.min(120, typeof o.espessura === 'number' ? Math.round(o.espessura) : 16));
                return {
                    id: id,
                    tipo: 'line',
                    nome: nome,
                    espessura: espessura,
                    pontos: pontos,
                    x: minX,
                    y: minY,
                    w: Math.max(1, maxX - minX),
                    h: Math.max(1, maxY - minY)
                };
            } else {
                const x = o.x !== undefined ? o.x : (o.x1 !== undefined ? o.x1 : 0);
                const y = o.y !== undefined ? o.y : (o.y1 !== undefined ? o.y1 : 0);
                const w = o.w !== undefined ? o.w : (o.x2 !== undefined ? (o.x2 - x) : 50);
                const h = o.h !== undefined ? o.h : (o.y2 !== undefined ? (o.y2 - y) : 50);
                return {
                    id: id,
                    tipo: tipo,
                    nome: nome,
                    x: Math.round(x),
                    y: Math.round(y),
                    w: Math.round(Math.max(4, w)),
                    h: Math.round(Math.max(4, h)),
                    x1: Math.round(x),
                    y1: Math.round(y),
                    x2: Math.round(x + w),
                    y2: Math.round(y + h)
                };
            }
        });
    }

    let OBSTACULOS = normalizarObstaculos(DEFAULT_OBSTACULOS);
    let CAMADAS = [];

    function normalizarCamadas(lista) {
        if (!Array.isArray(lista)) return [];
        return lista.map(function (camada, idx) {
            const tipo = camada.tipo === 'line' ? 'line' : 'rect';
            const pontos = Array.isArray(camada.pontos) ? camada.pontos.map(function (pt) {
                return { x: Math.round(Number(pt.x) || 0), y: Math.round(Number(pt.y) || 0) };
            }) : [];
            let x = Math.round(Number(camada.x) || 0);
            let y = Math.round(Number(camada.y) || 0);
            let w = Math.max(4, Math.round(Number(camada.w) || 40));
            let h = Math.max(4, Math.round(Number(camada.h) || 40));
            if (tipo === 'line' && pontos.length > 0) {
                let minX = pontos[0].x, maxX = pontos[0].x, minY = pontos[0].y, maxY = pontos[0].y;
                for (let pi = 1; pi < pontos.length; pi++) {
                    minX = Math.min(minX, pontos[pi].x);
                    maxX = Math.max(maxX, pontos[pi].x);
                    minY = Math.min(minY, pontos[pi].y);
                    maxY = Math.max(maxY, pontos[pi].y);
                }
                x = minX;
                y = minY;
                w = Math.max(4, maxX - minX);
                h = Math.max(4, maxY - minY);
            }
            return {
                id: camada.id || ('camada_' + (idx + 1) + '_' + Date.now().toString(36)),
                tipo: tipo,
                nome: camada.nome || ('Camada ' + (idx + 1)),
                x: x,
                y: y,
                w: w,
                h: h,
                espessura: tipo === 'line' ? Math.max(4, Math.min(120, Math.round(Number(camada.espessura) || 16))) : undefined,
                pontos: tipo === 'line' ? pontos : undefined,
                baseY: Number.isFinite(Number(camada.baseY)) ? Math.round(Number(camada.baseY)) : y + h,
                ordem: Number.isFinite(Number(camada.ordem)) ? Math.round(Number(camada.ordem)) : 0
            };
        });
    }

    // Carregamento persistente de colisoes_cidade.json no Node.js
    if (typeof module !== 'undefined' && module.exports) {
        try {
            const fs = require('fs');
            const path = require('path');
            const fileCol = path.join(__dirname, 'colisoes_cidade.json');
            if (fs.existsSync(fileCol)) {
                const raw = fs.readFileSync(fileCol, 'utf-8');
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    OBSTACULOS = normalizarObstaculos(parsed);
                }
            }
            const fileCamadas = path.join(__dirname, 'camadas_cidade.json');
            if (fs.existsSync(fileCamadas)) {
                const rawCamadas = fs.readFileSync(fileCamadas, 'utf-8');
                CAMADAS = normalizarCamadas(JSON.parse(rawCamadas));
            }
        } catch (e) {
            console.error('mapa_cidade.js: Erro ao carregar colisoes_cidade.json:', e.message);
        }
    }

    let grid = null;
    let _imgCidade = null;
    let _cacheCidadeCamadas = null;

    function invalidarCacheCidade() {
        _cacheCidadeCamadas = null;
        if (grid) grid = null;
    }

    function carregarObstaculos(novos) {
        OBSTACULOS = normalizarObstaculos(novos);
        invalidarCacheCidade();
        gerarCidade();
        return OBSTACULOS;
    }

    function obterObstaculos() {
        return JSON.parse(JSON.stringify(OBSTACULOS));
    }

    function carregarCamadas(novas) {
        CAMADAS = normalizarCamadas(novas);
        _cacheCidadeCamadas = null;
        return CAMADAS;
    }

    function obterCamadas() {
        return JSON.parse(JSON.stringify(CAMADAS));
    }

    function prepararCacheCidadeCamadas() {
        if (Array.isArray(_cacheCidadeCamadas) && _cacheCidadeCamadas.length === CAMADAS.length) return _cacheCidadeCamadas;
        _cacheCidadeCamadas = CAMADAS.map(function (camada, idx) {
            const wx = CID_X0 + camada.x;
            const wy = camada.y;
            const margem = camada.tipo === 'line' ? (camada.espessura || 16) : 0;
            const baseY = (camada.baseY || (camada.y + camada.h)) + (camada.ordem || 0) * 0.001;
            const item = {
                id: camada.id || ('camada_' + (idx + 1) + '_' + Date.now().toString(36)),
                tipo: camada.tipo,
                nome: camada.nome,
                x: camada.x,
                y: camada.y,
                w: camada.w,
                h: camada.h,
                espessura: camada.espessura,
                pontos: camada.pontos,
                baseY: baseY,
                ordem: camada.ordem || 0,
                wx: wx,
                wy: wy,
                margem: margem
            };
            item.draw = function () {
                if (!_imgCidade || !_imgCidade.complete) return;
                const ctx = global.ctx;
                if (!ctx) return;
                ctx.save();
                if (item.tipo === 'line' && item.pontos && item.pontos.length > 1) {
                    ctx.beginPath();
                    criarCaminhoFaixaCamada(ctx, item.pontos, item.espessura || 16);
                    ctx.clip();
                    ctx.drawImage(_imgCidade, CID_X0, 0, LARGURA, ALTURA);
                } else {
                    ctx.drawImage(_imgCidade, item.x, item.y, item.w, item.h, CID_X0 + item.x, item.y, item.w, item.h);
                }
                ctx.restore();
            };
            return item;
        });
        return _cacheCidadeCamadas;
    }

    // ============================================================================
    // GERAÇÃO DA GRADE (Compatibilidade isomórfica)
    // ============================================================================
    function gerarCidade() {
        if (grid) return grid;
        grid = [];
        for (let l = 0; l < ROWS; l++) {
            const row = [];
            for (let c = 0; c < COLS; c++) {
                const wx = CID_X0 + c * TILE + TILE / 2;
                const wy = l * TILE + TILE / 2;
                const colide = colideCidade(wx, wy, 2);
                row.push({
                    tipo: colide ? 'muro' : 'rua',
                    alt: colide ? ALT_MEDIA : ALT_LIVRE
                });
            }
            grid.push(row);
        }
        return grid;
    }

    function isCidade(x, y) {
        return x >= CID_X0 && x < CID_X1 && y >= 0 && y < CID_Y1;
    }

    // ============================================================================
    // SISTEMA DE COLISÃO
    // ============================================================================
    function colideCidade(x, y, raio) {
        if (!isCidade(x, y)) return true;
        const r = (typeof raio === 'number') ? raio : 8;
        const lx = x - CID_X0;
        const ly = y;

        for (let i = 0; i < OBSTACULOS.length; i++) {
            const o = OBSTACULOS[i];
            if (o.tipo === 'rect') {
                const x1 = o.x !== undefined ? o.x : o.x1;
                const y1 = o.y !== undefined ? o.y : o.y1;
                const x2 = o.w !== undefined ? (x1 + o.w) : o.x2;
                const y2 = o.h !== undefined ? (y1 + o.h) : o.y2;
                if (lx + r >= x1 && lx - r <= x2 && ly + r >= y1 && ly - r <= y2) {
                    return true;
                }
            } else if (o.tipo === 'circle') {
                const dx = lx - o.cx;
                const dy = ly - o.cy;
                const rTotal = o.r + r;
                if ((dx * dx + dy * dy) <= rTotal * rTotal) {
                    return true;
                }
            } else if (o.tipo === 'line') {
                if (o.pontos && o.pontos.length >= 2) {
                    const rTotal = (o.espessura ? o.espessura / 2 : 8) + r;
                    if (lx + rTotal >= o.x && lx - rTotal <= o.x + o.w &&
                        ly + rTotal >= o.y && ly - rTotal <= o.y + o.h) {
                        for (let j = 0; j < o.pontos.length - 1; j++) {
                            const p1 = o.pontos[j];
                            const p2 = o.pontos[j + 1];
                            const minSegX = Math.min(p1.x, p2.x) - rTotal;
                            const maxSegX = Math.max(p1.x, p2.x) + rTotal;
                            const minSegY = Math.min(p1.y, p2.y) - rTotal;
                            const maxSegY = Math.max(p1.y, p2.y) + rTotal;
                            if (lx >= minSegX && lx <= maxSegX && ly >= minSegY && ly <= maxSegY) {
                                if (distPontoSegmento(lx, ly, p1.x, p1.y, p2.x, p2.y) <= rTotal) {
                                    return true;
                                }
                            }
                        }
                    }
                }
            }
        }
        return false;
    }

    function colideProjetilCidade(x, y) {
        return colideCidade(x, y, 2);
    }

    function colideMapaAtivo(x, y, raio) {
        const m = global.currentMap;
        if (m === 'cidade') return !isCidade(x, y) || colideCidade(x, y, raio);
        if (m === 'arena') return (global.colideArena ? global.colideArena(x, y, raio) : false);
        if (m === 'caverna') return (global.colideCaverna ? global.colideCaverna(x, y, raio) : false);
        if (m === 'pantano') return (global.colidePantano ? global.colidePantano(x, y, raio) : false);
        if (m === 'desert') return (global.colideDeserto ? global.colideDeserto(x, y, raio) : false);
        return false;
    }

    function depositarPosicaoSegura(x0, y0) {
        if (isCidade(x0, y0) && !colideCidade(x0, y0, 10)) return { x: x0, y: y0 };
        return { x: PONTO_SPAWN.x, y: PONTO_SPAWN.y };
    }

    // ============================================================================
    // HIT-TEST DO PORTAL DE VIAGEM
    // ============================================================================
    function tocarPortalViagem(mx, my) {
        if (mx === undefined || my === undefined) return false;
        const dist = Math.hypot(mx - PORTAL_MAPAS.x, my - PORTAL_MAPAS.y);
        return dist <= (PORTAL_MAPAS.r + 18);
    }

    // ============================================================================
    // TRANSIÇÃO DE MAPA E PORTAIS
    // ============================================================================
    let transicaoAtiva = false;

    function infoPortalCidade(x, y) {
        if (x >= CID_X0 && x < CID_X1) {
            const dRetorno = Math.hypot(x - PORTA_CIDADE_RETORNO.x, y - PORTA_CIDADE_RETORNO.y);
            if (dRetorno < PORTA_CIDADE_RETORNO.r) {
                return { via: 'portal', mapa: 'green', alvo: PORTA_CIDADE_RETORNO.alvo };
            }
            return null;
        }
        if (x < (global.LARGURA_VERDE || 18000)) {
            const dVerde = Math.hypot(x - PORTA_CIDADE_VERDE.x, y - PORTA_CIDADE_VERDE.y);
            if (dVerde < PORTA_CIDADE_VERDE.r) {
                return { via: 'portal', mapa: 'cidade', alvo: PORTA_CIDADE_VERDE.alvo };
            }
        }
        return null;
    }

    let cidadeChainAnterior = null;

    function onUpdatePosicao(x, y) {
        if (transicaoAtiva || global.estaMorto) return;
        if (typeof global.portalMapaPodeDisparar === 'function' && !global.portalMapaPodeDisparar(x, y)) return;
        let info = null;
        if (x >= CID_X0) {
            info = infoPortalCidade(x, y);
        } else if (x < (global.LARGURA_VERDE || 18000)) {
            info = infoPortalCidade(x, y);
        }

        if (!info && cidadeChainAnterior && typeof cidadeChainAnterior.onUpdatePosicao === 'function') {
            cidadeChainAnterior.onUpdatePosicao(x, y);
            return;
        }
        if (!info) return;

        if (typeof global.solicitarTeleporteMapa === 'function') {
            global.solicitarTeleporteMapa(info.mapa, 'cidade_' + info.mapa);
            return;
        }
        transicaoAtiva = true;
    }

    // ============================================================================
    // RENDERIZAÇÃO GRÁFICA (Canvas 2D nativo 1:1)
    // ============================================================================
    function desenharCenarioCidade(t) {
        const ctx = global.ctx;
        if (!ctx) return;

        let camX = global.camX || 0;
        let camY = global.camY || 0;
        let cw = ((global.canvas && global.canvas.width) || 800) / (global.ZOOM_CAMERA || 1);
        let ch = ((global.canvas && global.canvas.height) || 600) / (global.ZOOM_CAMERA || 1);

        if (CID_X1 < camX || CID_X0 > camX + cw || CID_Y1 < camY || 0 > camY + ch) return;

        if (!_imgCidade) {
            _imgCidade = new Image();
            _imgCidade.src = 'sprites/cidade.png';
        }

        if (_imgCidade.complete && (_imgCidade.naturalWidth || _imgCidade.width) > 0) {
            ctx.drawImage(_imgCidade, CID_X0, 0, LARGURA, ALTURA);
        } else {
            ctx.fillStyle = '#2c2a27';
            ctx.fillRect(CID_X0, 0, LARGURA, ALTURA);
        }

        desenharPortalViagem(ctx, t, camX, camY, cw, ch);
        desenharPortalRetorno(ctx, t, camX, camY, cw, ch);
    }

    function desenharPortalViagem(ctx, t, camX, camY, cw, ch) {
        const px = PORTAL_MAPAS.x, py = PORTAL_MAPAS.y, r = PORTAL_MAPAS.r;
        if (px + r + 80 < camX || px - r - 80 > camX + cw || py + r + 80 < camY || py - r - 80 > camY + ch) return;

        const pulsar = 1 + Math.sin(t * 3.0) * 0.08;
        const R = r * pulsar;

        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.beginPath();
        ctx.ellipse(px, py + 10, R * 1.2, R * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#00e5ff';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.ellipse(px, py, R, R * 0.62, 0, 0, Math.PI * 2);
        ctx.stroke();

        const grad = ctx.createRadialGradient(px, py, 2, px, py, R);
        grad.addColorStop(0, 'rgba(230, 255, 255, 0.85)');
        grad.addColorStop(0.35, 'rgba(0, 180, 255, 0.60)');
        grad.addColorStop(0.75, 'rgba(20, 80, 200, 0.45)');
        grad.addColorStop(1, 'rgba(5, 15, 40, 0.20)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(px, py, R - 2, (R - 2) * 0.62, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.lineWidth = 2.2;
        for (let i = 0; i < 4; i++) {
            const rot = t * 1.8 + (i * Math.PI) / 2;
            ctx.strokeStyle = (i % 2 === 0) ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 229, 255, 0.7)';
            ctx.beginPath();
            ctx.ellipse(px, py, (R * 0.7) - i * 5, ((R * 0.7) - i * 5) * 0.62, rot, 0, Math.PI * 0.7);
            ctx.stroke();
        }

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 13px Arial';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#00e5ff';
        ctx.shadowBlur = 10;
        ctx.fillText('PORTAL DE VIAGEM', px, py - R * 0.62 - 12);
        ctx.fillStyle = '#80d8ff';
        ctx.font = '11px Arial';
        ctx.fillText('Toque para Viajar', px, py - R * 0.62 - 1);
        ctx.restore();
    }

    function desenharPortalRetorno(ctx, t, camX, camY, cw, ch) {
        const px = PORTA_CIDADE_RETORNO.x, py = PORTA_CIDADE_RETORNO.y, r = PORTA_CIDADE_RETORNO.r;
        if (px + r + 60 < camX || px - r - 60 > camX + cw || py + r + 60 < camY || py - r - 60 > camY + ch) return;

        const pulsar = 1 + Math.sin(t * 2.5) * 0.10;
        const R = (r - 10) * pulsar;

        ctx.save();
        ctx.strokeStyle = '#f1c40f';
        ctx.lineWidth = 2.8;
        ctx.beginPath();
        ctx.ellipse(px, py, R, R * 0.5, 0, 0, Math.PI * 2);
        ctx.stroke();

        const grad = ctx.createRadialGradient(px, py, 2, px, py, R);
        grad.addColorStop(0, 'rgba(255, 245, 180, 0.6)');
        grad.addColorStop(0.5, 'rgba(241, 196, 15, 0.3)');
        grad.addColorStop(1, 'rgba(20, 15, 5, 0.1)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(px, py, R, R * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#f9e79f';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#f1c40f';
        ctx.shadowBlur = 8;
        ctx.fillText('SAÍDA DA CIDADE', px, py + 25);
        ctx.restore();
    }

    function criarCaminhoFaixaCamada(ctx, pontos, largura) {
        const meio = Math.max(2, largura / 2);
        const esquerda = [];
        const direita = [];

        for (let i = 0; i < pontos.length; i++) {
            const anterior = pontos[i > 0 ? i - 1 : i];
            const proximo = pontos[i + 1 < pontos.length ? i + 1 : i];
            let dx = proximo.x - anterior.x;
            let dy = proximo.y - anterior.y;
            const comprimento = Math.hypot(dx, dy) || 1;
            dx /= comprimento;
            dy /= comprimento;
            const nx = -dy * meio;
            const ny = dx * meio;
            esquerda.push({ x: CID_X0 + pontos[i].x + nx, y: pontos[i].y + ny });
            direita.push({ x: CID_X0 + pontos[i].x - nx, y: pontos[i].y - ny });
        }

        ctx.moveTo(esquerda[0].x, esquerda[0].y);
        for (let i = 1; i < esquerda.length; i++) ctx.lineTo(esquerda[i].x, esquerda[i].y);
        for (let i = direita.length - 1; i >= 0; i--) ctx.lineTo(direita[i].x, direita[i].y);
        ctx.closePath();
    }

    function coletarCidadeSortables(t, arr) {
        if (!Array.isArray(arr) || !CAMADAS.length || !_imgCidade || !_imgCidade.complete || !(_imgCidade.naturalWidth || _imgCidade.width)) return;

        const camX = global.camX || 0;
        const camY = global.camY || 0;
        const cw = ((global.canvas && global.canvas.width) || 800) / (global.ZOOM_CAMERA || 1);
        const ch = ((global.canvas && global.canvas.height) || 600) / (global.ZOOM_CAMERA || 1);
        const cache = prepararCacheCidadeCamadas();

        for (let i = 0; i < cache.length; i++) {
            const camada = cache[i];
            if (camada.wx + camada.w + camada.margem < camX || camada.wx - camada.margem > camX + cw || camada.wy + camada.h + camada.margem < camY || camada.wy - camada.margem > camY + ch) continue;
            arr.push({
                y: camada.baseY,
                draw: camada.draw
            });
        }
    }

    function desenharVortex(ctx, x, y, t, cor) {
        ctx.save();
        ctx.shadowColor = cor;
        ctx.shadowBlur = 16;
        ctx.fillStyle = 'rgba(10, 5, 20, 0.6)';
        ctx.beginPath(); ctx.arc(x, y, 48, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = cor;
        ctx.globalAlpha = 0.85;
        for (let i = 0; i < 4; i++) {
            const raio = 16 + i * 8;
            const a0 = t * 1.5 + i * 1.25;
            ctx.lineWidth = 2.8;
            ctx.beginPath();
            ctx.arc(x, y, raio, a0, a0 + Math.PI * 0.8);
            ctx.stroke();
        }
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
        LARGURA: LARGURA, ALTURA: ALTURA,
        COLS: COLS, ROWS: ROWS,
        ALT_LIVRE: ALT_LIVRE, ALT_PEQUENA: ALT_PEQUENA, ALT_MEDIA: ALT_MEDIA, ALT_ALTA: ALT_ALTA,
        PORTA_CIDADE_VERDE: PORTA_CIDADE_VERDE,
        PORTA_CIDADE_RETORNO: PORTA_CIDADE_RETORNO,
        PORTAL_MAPAS: PORTAL_MAPAS,
        PONTO_SPAWN: PONTO_SPAWN,
        gerarCidade: gerarCidade,
        grid: function () { return grid || gerarCidade(); },
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
        tocarPortalViagem: tocarPortalViagem,
        carregarObstaculos: carregarObstaculos,
        obterObstaculos: obterObstaculos,
        carregarCamadas: carregarCamadas,
        obterCamadas: obterCamadas
    };

    if (typeof window !== 'undefined') {
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

    if (typeof module !== 'undefined' && module.exports) {
        if (!grid) gerarCidade();
        module.exports = api;
    }
})(typeof window !== 'undefined' ? window : this);
